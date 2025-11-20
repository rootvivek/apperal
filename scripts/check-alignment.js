const https = require('https');

const FIGMA_API_KEY = process.env.FIGMA_API_KEY || '';
const FILE_KEY = 'GlAxWG5CIynQR60Tgupefx';

function getAlignment(node, info = []) {
  if (node.type === 'FRAME' || node.type === 'TEXT') {
    const bbox = node.absoluteBoundingBox || {};
    info.push({
      name: node.name || '',
      type: node.type,
      x: bbox.x || 0,
      y: bbox.y || 0,
      width: bbox.width || 0,
      height: bbox.height || 0,
      counterAlign: node.counterAxisAlignItems || '',
      primaryAlign: node.primaryAxisAlignItems || '',
    });
  }
  
  if (node.children && Array.isArray(node.children)) {
    node.children.forEach(child => {
      getAlignment(child, info);
    });
  }
  
  return info;
}

const options = {
  hostname: 'api.figma.com',
  path: `/v1/files/${FILE_KEY}/nodes?ids=1:42`,
  method: 'GET',
  headers: {
    'X-Figma-Token': FIGMA_API_KEY
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const jsonData = JSON.parse(data);
      const node = jsonData.nodes['1:42'].document;
      const info = getAlignment(node);
      
      console.log('\n=== VERTICAL ALIGNMENT CHECK ===\n');
      info.forEach(item => {
        if (item.name && (item.name.includes('Frame 8') || item.name.includes('Frame 7') || item.name.includes('Frame 9') || item.name.includes('Product') || item.name.includes('Date') || item.name.includes('Cash'))) {
          console.log(`${item.name} (${item.type}):`);
          console.log(`  Position: x=${item.x}, y=${item.y}`);
          console.log(`  Size: ${item.width}x${item.height}px`);
          if (item.counterAlign) console.log(`  Counter Align: ${item.counterAlign}`);
          if (item.primaryAlign) console.log(`  Primary Align: ${item.primaryAlign}`);
          console.log();
        }
      });
      
      // Check alignment
      const frame8 = info.find(i => i.name === 'Frame 8');
      const frame7 = info.find(i => i.name === 'Frame 7');
      const frame9 = info.find(i => i.name === 'Frame 9');
      const productTitle = info.find(i => i.name === 'Product Title');
      
      if (frame8 && frame7 && frame9 && productTitle) {
        console.log('Alignment Analysis:');
        console.log(`Frame 8 (container) y: ${frame8.y}, height: ${frame8.height}`);
        console.log(`Frame 7 (image) y: ${frame7.y}, height: ${frame7.height}`);
        console.log(`Frame 9 (text container) y: ${frame9.y}, height: ${frame9.height}`);
        console.log(`Product Title y: ${productTitle.y}`);
        console.log(`\nImage top: ${frame7.y}`);
        console.log(`Text top: ${productTitle.y}`);
        console.log(`Difference: ${productTitle.y - frame7.y}px`);
      }
    } catch (error) {
      console.error('Error:', error.message);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
});

req.end();

