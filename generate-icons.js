const fs = require('fs');
const { createCanvas } = require('canvas');

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Background
  ctx.fillStyle = '#2D3B7D';
  ctx.fillRect(0, 0, size, size);
  
  // Circle
  ctx.fillStyle = '#FF1493';
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/3, 0, Math.PI * 2);
  ctx.fill();
  
  // Text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${size/2}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🍽', size/2, size/2);
  
  return canvas.toBuffer('image/png');
}

fs.writeFileSync('/sessions/pensive-happy-hypatia/mnt/Giappone-2027-main-2/icon-192.png', generateIcon(192));
fs.writeFileSync('/sessions/pensive-happy-hypatia/mnt/Giappone-2027-main-2/icon-512.png', generateIcon(512));
console.log('Icons generated!');
