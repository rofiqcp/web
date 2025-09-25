# ESP32 S2 SCADA Web Interface

A modern web-based SCADA (Supervisory Control and Data Acquisition) system for ESP32 S2 microcontroller control and monitoring.

## Features

### Control Inputs
- **2 Push Buttons**: On/Off momentary controls
- **2 Toggle Switches**: Persistent on/off states
- **4 Sliders**: Variable control (0-100%)

### Monitoring Outputs
- **4 Status Indicators**: LED-style on/off displays
- **2 Analog Gauges**: Circular gauges with needle indicators
- **2 Variable Boxes**: Numeric value displays with units

### Additional Features
- **Settings Panel**: Configure ESP32 IP, update intervals, and connection settings
- **Real-time Communication**: WebSocket-based real-time data exchange
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Modern UI**: Glass-morphism design with smooth animations
- **Connection Status**: Visual indication of ESP32 connection status
- **Demo Mode**: Built-in simulation for testing without hardware

## Installation

1. **Clone or download the project**
```bash
cd d:\PROGRAM\web
```

2. **Install dependencies**
```bash
npm install
```

3. **Start the server**
```bash
npm start
```

4. **For development with auto-restart**
```bash
npm run dev
```

## Usage

### Web Interface
1. Open your browser and navigate to `http://localhost:3000`
2. The interface will load with demo data if no ESP32 is connected
3. Use the controls to send commands to the ESP32
4. Monitor real-time data from the ESP32 sensors

### ESP32 Integration

#### HTTP API Endpoints

**Get Control Data (ESP32 → Server)**
```
GET /api/controls
Response: {
  "success": true,
  "data": {
    "pushButtons": {"1": false, "2": false},
    "toggles": {"1": false, "2": false},
    "sliders": {"1": 50, "2": 50, "3": 50, "4": 50}
  },
  "timestamp": 1234567890
}
```

**Send Monitoring Data (ESP32 → Server)**
```
POST /api/monitoring
Content-Type: application/json

{
  "indicators": {"1": true, "2": false, "3": true, "4": false},
  "gauges": {"1": 75, "2": 42},
  "variables": {"1": 12.34, "2": 3.45}
}
```

**Server Status**
```
GET /api/status
Response: {
  "success": true,
  "esp32Connected": true,
  "connectedClients": 2,
  "lastUpdate": 1234567890,
  "uptime": 3600
}
```

### ESP32 Arduino Code Example

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* serverURL = "http://192.168.1.100:3000";

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting to WiFi...");
  }
  
  Serial.println("Connected to WiFi");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  // Get control data from server
  getControlData();
  
  // Send monitoring data to server
  sendMonitoringData();
  
  delay(1000); // Update every second
}

void getControlData() {
  HTTPClient http;
  http.begin(String(serverURL) + "/api/controls");
  
  int httpResponseCode = http.GET();
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, response);
    
    // Process control data
    bool pushBtn1 = doc["data"]["pushButtons"]["1"];
    bool pushBtn2 = doc["data"]["pushButtons"]["2"];
    bool toggle1 = doc["data"]["toggles"]["1"];
    bool toggle2 = doc["data"]["toggles"]["2"];
    int slider1 = doc["data"]["sliders"]["1"];
    int slider2 = doc["data"]["sliders"]["2"];
    int slider3 = doc["data"]["sliders"]["3"];
    int slider4 = doc["data"]["sliders"]["4"];
    
    // Apply control logic here
    Serial.printf("Controls - Push1: %d, Toggle1: %d, Slider1: %d\n", 
                  pushBtn1, toggle1, slider1);
  }
  
  http.end();
}

void sendMonitoringData() {
  HTTPClient http;
  http.begin(String(serverURL) + "/api/monitoring");
  http.addHeader("Content-Type", "application/json");
  
  // Create monitoring data JSON
  DynamicJsonDocument doc(1024);
  
  // Read your sensors here and populate the data
  doc["indicators"]["1"] = digitalRead(2);  // Example pin
  doc["indicators"]["2"] = digitalRead(4);
  doc["indicators"]["3"] = digitalRead(5);
  doc["indicators"]["4"] = digitalRead(18);
  
  doc["gauges"]["1"] = map(analogRead(A0), 0, 4095, 0, 100);
  doc["gauges"]["2"] = map(analogRead(A1), 0, 4095, 0, 100);
  
  doc["variables"]["1"] = analogRead(A0) * 3.3 / 4095.0; // Voltage
  doc["variables"]["2"] = random(0, 500) / 100.0;        // Current
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode > 0) {
    Serial.println("Monitoring data sent successfully");
  } else {
    Serial.printf("Error sending data: %d\n", httpResponseCode);
  }
  
  http.end();
}
```

## Configuration

### Settings Panel
Access the settings panel by clicking the "Settings" button in the footer:

- **ESP32 IP Address**: Set the IP address of your ESP32 device
- **Update Interval**: Configure how often data is refreshed (in milliseconds)
- **Auto Connect**: Enable automatic connection on page load

### Environment Variables
You can set the following environment variables:

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment mode (development/production)

## File Structure

```
esp32-scada-web/
├── package.json          # Project dependencies and scripts
├── server.js            # Node.js server with Socket.IO
├── README.md           # This file
└── public/
    ├── index.html      # Main web interface
    ├── style.css       # Modern SCADA styling
    └── script.js       # Client-side JavaScript
```

## API Documentation

### WebSocket Events

**Client → Server:**
- `controlData`: Send control changes to ESP32
- `ping`: Connection health check

**Server → Client:**
- `monitoringData`: Real-time monitoring data updates
- `controlUpdate`: Control state changes from other clients
- `controlStates`: Current control states

## Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Troubleshooting

### Common Issues

1. **Connection Failed**
   - Check if the server is running on the correct port
   - Verify firewall settings
   - Ensure ESP32 and server are on the same network

2. **No Data Updates**
   - Check ESP32 connection status
   - Verify API endpoints are accessible
   - Check browser console for errors

3. **Controls Not Working**
   - Ensure WebSocket connection is established
   - Check network connectivity
   - Verify ESP32 is polling the control endpoint

### Debug Mode

Open browser console and use these debug commands:

```javascript
// Get current control states
debugSCADA.getStates()

// Get monitoring data
debugSCADA.getMonitoring()

// Get settings
debugSCADA.getSettings()

// Manual connection
debugSCADA.connect()

// Disconnect
debugSCADA.disconnect()
```

## License

MIT License - feel free to use this project for your own ESP32 SCADA applications.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For issues and questions, please check the troubleshooting section or create an issue in the project repository.
