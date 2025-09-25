// SCADA Control System for ESP32 S2
class SCADAController {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.settings = {
            esp32Ip: '192.168.1.100',
            updateInterval: 1000,
            autoConnect: true
        };
        
        // Control states
        this.controlStates = {
            pushButtons: { 1: false, 2: false },
            toggles: { 1: false, 2: false },
            sliders: { 1: 50, 2: 50, 3: 50, 4: 50 }
        };
        
        // Monitoring data
        this.monitoringData = {
            indicators: { 1: false, 2: false, 3: false, 4: false },
            gauges: { 1: 0, 2: 0 },
            variables: { 1: 0.00, 2: 0.00 }
        };
        
        this.init();
    }
    
    init() {
        this.loadSettings();
        this.initializeElements();
        this.bindEvents();
        this.startSimulation(); // For demo purposes
        
        if (this.settings.autoConnect) {
            this.connect();
        }
    }
    
    initializeElements() {
        // Initialize all UI elements
        this.updateConnectionStatus(false);
        this.updateLastUpdateTime();
        
        // Set initial slider values
        for (let i = 1; i <= 4; i++) {
            const slider = document.getElementById(`slider${i}`);
            const valueSpan = document.getElementById(`slider${i}Value`);
            if (slider && valueSpan) {
                slider.value = this.controlStates.sliders[i];
                valueSpan.textContent = this.controlStates.sliders[i];
            }
        }
    }
    
    bindEvents() {
        // Push buttons
        document.querySelectorAll('.push-button').forEach(btn => {
            btn.addEventListener('mousedown', (e) => this.handlePushButton(e, true));
            btn.addEventListener('mouseup', (e) => this.handlePushButton(e, false));
            btn.addEventListener('mouseleave', (e) => this.handlePushButton(e, false));
        });
        
        // Toggle switches
        document.querySelectorAll('input[type="checkbox"][data-id]').forEach(toggle => {
            toggle.addEventListener('change', (e) => this.handleToggle(e));
        });
        
        // Sliders
        document.querySelectorAll('.control-slider').forEach(slider => {
            slider.addEventListener('input', (e) => this.handleSlider(e));
        });
        
        // Settings panel
        document.getElementById('settingsBtn').addEventListener('click', () => this.openSettings());
        document.getElementById('closeSettings').addEventListener('click', () => this.closeSettings());
        document.getElementById('saveSettings').addEventListener('click', () => this.saveSettings());
        
        // Click outside settings to close
        document.addEventListener('click', (e) => {
            const settingsPanel = document.getElementById('settingsPanel');
            const settingsBtn = document.getElementById('settingsBtn');
            if (!settingsPanel.contains(e.target) && !settingsBtn.contains(e.target)) {
                this.closeSettings();
            }
        });
    }
    
    handlePushButton(event, isPressed) {
        const buttonId = parseInt(event.target.closest('.push-button').dataset.id);
        const button = event.target.closest('.push-button');
        
        this.controlStates.pushButtons[buttonId] = isPressed;
        
        if (isPressed) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
        
        this.sendControlData('pushButton', buttonId, isPressed);
        console.log(`Push Button ${buttonId}: ${isPressed ? 'Pressed' : 'Released'}`);
    }
    
    handleToggle(event) {
        const toggleId = parseInt(event.target.dataset.id);
        const isOn = event.target.checked;
        
        this.controlStates.toggles[toggleId] = isOn;
        this.sendControlData('toggle', toggleId, isOn);
        console.log(`Toggle ${toggleId}: ${isOn ? 'ON' : 'OFF'}`);
    }
    
    handleSlider(event) {
        const sliderId = parseInt(event.target.dataset.id);
        const value = parseInt(event.target.value);
        
        this.controlStates.sliders[sliderId] = value;
        document.getElementById(`slider${sliderId}Value`).textContent = value;
        
        this.sendControlData('slider', sliderId, value);
        console.log(`Slider ${sliderId}: ${value}%`);
    }
    
    sendControlData(type, id, value) {
        // For GitHub Pages demo - just log the control data
        console.log('Demo Mode - Control data sent:', { type, id, value, timestamp: Date.now() });
        
        // Update local state for demo
        this.controlStates[type === 'pushButton' ? 'pushButtons' : type === 'toggle' ? 'toggles' : 'sliders'][id] = value;
    }
    
    connect() {
        // For GitHub Pages demo - simulate connection
        console.log('Demo mode: Simulating ESP32 connection...');
        setTimeout(() => {
            this.isConnected = true;
            this.updateConnectionStatus(true);
            console.log('Connected to ESP32 SCADA system (Demo Mode)');
        }, 1000);
    }
    
    updateMonitoringData(data) {
        // Update indicators
        if (data.indicators) {
            Object.keys(data.indicators).forEach(id => {
                const indicator = document.querySelector(`#indicator${id} .led`);
                if (indicator) {
                    indicator.setAttribute('data-status', data.indicators[id] ? 'on' : 'off');
                }
            });
        }
        
        // Update gauges
        if (data.gauges) {
            Object.keys(data.gauges).forEach(id => {
                this.updateGauge(id, data.gauges[id]);
            });
        }
        
        // Update variables
        if (data.variables) {
            Object.keys(data.variables).forEach(id => {
                const variableElement = document.getElementById(`variable${id}`);
                if (variableElement) {
                    variableElement.textContent = data.variables[id].toFixed(2);
                }
            });
        }
        
        this.updateLastUpdateTime();
    }
    
    updateGauge(gaugeId, value) {
        const needle = document.querySelector(`#gauge${gaugeId} .gauge-needle`);
        const valueDisplay = document.getElementById(`gauge${gaugeId}Value`);
        
        if (needle && valueDisplay) {
            // Convert value (0-100) to rotation angle (-90 to 90 degrees)
            const angle = (value / 100) * 180 - 90;
            needle.style.transform = `rotate(${angle}deg)`;
            valueDisplay.textContent = `${value}%`;
        }
    }
    
    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connectionStatus');
        if (connected) {
            statusElement.className = 'status-connected';
            statusElement.innerHTML = '<i class="fas fa-circle"></i> Connected';
        } else {
            statusElement.className = 'status-disconnected';
            statusElement.innerHTML = '<i class="fas fa-circle"></i> Disconnected';
        }
    }
    
    updateLastUpdateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString();
        document.getElementById('lastUpdate').textContent = timeString;
    }
    
    // Settings Management
    openSettings() {
        document.getElementById('settingsPanel').classList.add('open');
        this.loadSettingsToForm();
    }
    
    closeSettings() {
        document.getElementById('settingsPanel').classList.remove('open');
    }
    
    loadSettingsToForm() {
        document.getElementById('esp32Ip').value = this.settings.esp32Ip;
        document.getElementById('updateInterval').value = this.settings.updateInterval;
        document.getElementById('autoConnect').checked = this.settings.autoConnect;
    }
    
    saveSettings() {
        this.settings.esp32Ip = document.getElementById('esp32Ip').value;
        this.settings.updateInterval = parseInt(document.getElementById('updateInterval').value);
        this.settings.autoConnect = document.getElementById('autoConnect').checked;
        
        localStorage.setItem('scadaSettings', JSON.stringify(this.settings));
        
        // Show feedback
        const saveBtn = document.getElementById('saveSettings');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fas fa-check"></i> Saved!';
        saveBtn.style.background = 'linear-gradient(145deg, #4CAF50, #45a049)';
        
        setTimeout(() => {
            saveBtn.innerHTML = originalText;
            saveBtn.style.background = '';
        }, 2000);
        
        console.log('Settings saved:', this.settings);
    }
    
    loadSettings() {
        const saved = localStorage.getItem('scadaSettings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
    }
    
    // Demo simulation for testing without ESP32
    startSimulation() {
        setInterval(() => {
            // Simulate random monitoring data
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
                    1: (Math.random() * 24).toFixed(2),
                    2: (Math.random() * 5).toFixed(2)
                }
            };
            
            // Always update in demo mode for GitHub Pages
            this.updateMonitoringData(simulatedData);
        }, this.settings.updateInterval);
    }
    
    // Utility methods
    exportSettings() {
        const dataStr = JSON.stringify(this.settings, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'scada_settings.json';
        link.click();
    }
    
    importSettings(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                this.settings = { ...this.settings, ...imported };
                this.saveSettings();
                this.loadSettingsToForm();
            } catch (error) {
                console.error('Error importing settings:', error);
                alert('Error importing settings file');
            }
        };
        reader.readAsText(file);
    }
}

// Initialize SCADA system when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.scada = new SCADAController();
    console.log('ESP32 S2 SCADA System Initialized');
});

// Global functions for debugging
window.debugSCADA = {
    getStates: () => window.scada.controlStates,
    getMonitoring: () => window.scada.monitoringData,
    getSettings: () => window.scada.settings,
    connect: () => window.scada.connect(),
    disconnect: () => {
        if (window.scada.socket) {
            window.scada.socket.disconnect();
        }
    }
};
