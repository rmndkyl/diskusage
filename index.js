const disk = require("diskusage");
const os = require("os");
var osu = require("node-os-utils");
const express = require("express");
const http = require("http");

let path = os.platform() === "win32" ? "c:" : "/";

const socketIO = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  transports: ["websocket"], // Force WebSocket transport
});

// Specify the path to the disk you want to check

// Function to emit disk usage information to connected clients
const emitUsage = async () => {
  let totalGB, freeGB, totalFree, totalUsed;
  // get disk usage. Takes mount point as first parameter
  disk.check(path, function (err, info) {
    if (err) {
      console.log(err);
    } else {
      const { available, free, total } = info;
      totalFree = (free / total) * 100;
      totalUsed = ((total - free) / total) * 100;

      // Convert bytes to gigabytes
      totalGB = info.total / 1024 ** 3; // 1024^3 bytes in a GB
      freeGB = info.available / 1024 ** 3;
    }
  });
  const memory = osu.mem;

  // Initialize the memory usage tracker
  let mem = await memory.info();
  const {
    totalMemMb,
    usedMemMb,
    freeMemMb,
    usedMemPercentage,
    freeMemPercentage,
  } = mem;

  var cpu = osu.cpu;
  let cpuUsage = await cpu.usage();
  let cpuFree = await cpu.free();

  let d = {
    totalGb: `${totalGB.toFixed(2)}GB`,
    freeGb: `${freeGB.toFixed(2)}GB`,
    totalFree: `${totalFree.toFixed(2)}%`,
    totalUsed: `${totalUsed.toFixed(2)}%`,
    cpuUsage: `${cpuUsage.toFixed(2)}%`,
    cpuFree: `${cpuFree.toFixed(2)}%`,
    usedMemPercentage: `${usedMemPercentage.toFixed(2)}%`,
    totalMem: `${(totalMemMb / 1024).toFixed(2)}GB`,
    usedMem: `${(usedMemMb / 1024).toFixed(2)}GB`,
    usedMemPercentage: `${usedMemPercentage.toFixed(2)}%`,
  };
  //   console.log(d);
  io.emit("diskUsage", d);
};

app.use(express.static("public"));

// Define a route to serve the HTML page
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

// Establish a WebSocket connection
io.on("connection", (socket) => {
  const updateInterval = setInterval(() => {
    emitUsage();
  }, 2000);

  // Handle disconnection
  socket.on("disconnect", () => {
    clearInterval(updateInterval);
  });
});

// Start the server on port 5252
const PORT = 5252;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
