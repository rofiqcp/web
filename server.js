const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ESP32 data storage
let esp32Data = {
    controlStates: {
        pushButtons: { 1: false, 2: false },
        toggles: { 1: false, 2: false },
        sliders: { 1: 50, 2: 50, 3: 50, 4: 50 }
    },
    monitoringData: {
        indicators: { 1: false, 2: false, 3: false, 4: false },
        gauges: { 1: 0, 2: 0 },
        variables: { 1: 0.00, 2: 0.00 }
    },
    lastUpdate: Date.now()
};

// Connected clients tracking
let connectedClients = new Set();
let esp32Connected = false;

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint for ESP32 to get control data
app.get('/api/controls', (req, res) => {
    res.json({
        success: true,
        data: esp32Data.controlStates,
        timestamp: Date.now()
    });
});

// API endpoint for ESP32 to send monitoring data
app.post('/api/monitoring', (req, res) => {
    try {
        const { indicators, gauges, variables } = req.body;
        
        // Update monitoring data
        if (indicators) esp32Data.monitoringData.indicators = { ...esp32Data.monitoringData.indicators, ...indicators };
        if (gauges) esp32Data.monitoringData.gauges = { ...esp32Data.monitoringData.gauges, ...gauges };
        if (variables) esp32Data.monitoringData.variables = { ...esp32Data.monitoringData.variables, ...variables };
        
        esp32Data.lastUpdate = Date.now();
        esp32Connected = true;
        
        // Broadcast to all connected web clients
        io.emit('monitoringData', esp32Data.monitoringData);
        
        res.json({
            success: true,
            message: 'Monitoring data updated',
            timestamp: esp32Data.lastUpdate
        });
        
        console.log('Monitoring data received from ESP32:', req.body);
        
    } catch (error) {
        console.error('Error processing monitoring data:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// API endpoint for ESP32 status
app.get('/api/status', (req, res) => {
    res.json({
        success: true,
        esp32Connected: esp32Connected,
        connectedClients: connectedClients.size,
        lastUpdate: esp32Data.lastUpdate,
        uptime: process.uptime()
    });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    connectedClients.add(socket.id);
    
    // Send current data to newly connected client
    socket.emit('monitoringData', esp32Data.monitoringData);
    socket.emit('controlStates', esp32Data.controlStates);
    
    // Handle control data from web interface
    socket.on('controlData', (data) => {
        try {
            const { type, id, value, timestamp } = data;
            
            // Update control states
            switch (type) {
                case 'pushButton':
                    esp32Data.controlStates.pushButtons[id] = value;
                    break;
                case 'toggle':
                    esp32Data.controlStates.toggles[id] = value;
                    break;
                case 'slider':
                    esp32Data.controlStates.sliders[id] = value;
                    break;
            }
            
            esp32Data.lastUpdate = Date.now();
            
            // Broadcast control changes to all clients (including ESP32 if connected via WebSocket)
            socket.broadcast.emit('controlUpdate', {
                type,
                id,
                value,
                timestamp: esp32Data.lastUpdate
            });
            
            console.log(`Control update - ${type} ${id}: ${value}`);
            
        } catch (error) {
            console.error('Error processing control data:', error);
        }
    });
    
    // Handle ESP32 connection (if ESP32 uses WebSocket instead of HTTP)
    socket.on('esp32Connect', (data) => {
        console.log('ESP32 connected via WebSocket:', data);
        esp32Connected = true;
        socket.esp32 = true;
        
        // Send current control states to ESP32
        socket.emit('controlStates', esp32Data.controlStates);
    });
    
    // Handle client disconnect
    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        connectedClients.delete(socket.id);
        
        if (socket.esp32) {
            esp32Connected = false;
            console.log('ESP32 disconnected');
        }
    });
    
    // Handle ping for connection monitoring
    socket.on('ping', (callback) => {
        if (callback) callback();
    });
});

// Simulation mode for testing without ESP32
let simulationMode = true;
if (simulationMode) {
    console.log('Starting simulation mode...');
    
    setInterval(() => {
        // Simulate ESP32 monitoring data
        const simulatedData = {
            indicators: {
                1: Math.random() > 0.5,
                2: Math.random() > 0.7,
                3: Math.random() > 0.3,
                4: Math.random() > 0.6
            },
            gauges: {
                1: Math.floor(Math.random() * 100),
                2: Math.floor(Math.random() * 100)
            },
            variables: {
                1: parseFloat((Math.random() * 24).toFixed(2)),
                2: parseFloat((Math.random() * 5).toFixed(2))
            }
        };
        
        // Update monitoring data
        esp32Data.monitoringData = simulatedData;
        esp32Data.lastUpdate = Date.now();
        
        // Broadcast to all connected clients
        io.emit('monitoringData', simulatedData);
        
    }, 2000); // Update every 2 seconds
}

// ESP32 connection monitoring
setInterval(() => {
    const timeSinceLastUpdate = Date.now() - esp32Data.lastUpdate;
    if (timeSinceLastUpdate > 10000) { // 10 seconds timeout
        if (esp32Connected) {
            console.log('ESP32 connection timeout');
            esp32Connected = false;
        }
    }
}, 5000);

// Error handling
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`🚀 ESP32 S2 SCADA Server running on port ${PORT}`);
    console.log(`📱 Web Interface: http://localhost:${PORT}`);
    console.log(`🔌 ESP32 API Endpoint: http://localhost:${PORT}/api`);
    console.log(`📊 Server Status: http://localhost:${PORT}/api/status`);
    
    if (simulationMode) {
        console.log('🎮 Simulation mode enabled - generating demo data');
    }
});
