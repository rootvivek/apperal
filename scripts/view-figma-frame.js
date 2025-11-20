const https = require('https');

const FIGMA_API_KEY = process.env.FIGMA_API_KEY || '';
const FILE_KEY = 'GlAxWG5CIynQR60Tgupefx';

// Get node ID from command line argument
const nodeId = process.argv[2];

if (!nodeId) {
  console.log('Usage: node scripts/view-figma-frame.js <node-id>');
  console.log('\nExample: node scripts/view-figma-frame.js 1-2');
  console.log('\nTo find node-id:');
  console.log('1. Select a frame in Figma');
  console.log('2. Copy the node-id from the URL (e.g., node-id=1-123)');
  console.log('3. Use it as: node scripts/view-figma-frame.js 1-123\n');
  process.exit(1);
}

function extractTextNodes(node, texts = []) {
  if (node.type === 'TEXT') {
    texts.push({
      id: node.id,
      name: node.name,
      characters: node.characters,
      style: node.style,
      absoluteBoundingBox: node.absoluteBoundingBox
    });
  }
  
  if (node.children && Array.isArray(node.children)) {
    node.children.forEach(child => {
      extractTextNodes(child, texts);
    });
  }
  
  return texts;
}

function extractImages(node, images = []) {
  if (node.fills && Array.isArray(node.fills)) {
    node.fills.forEach(fill => {
      if (fill.type === 'IMAGE' && fill.imageRef) {
        images.push({
          id: node.id,
          name: node.name,
          imageRef: fill.imageRef,
          absoluteBoundingBox: node.absoluteBoundingBox
        });
      }
    });
  }
  
  if (node.children && Array.isArray(node.children)) {
    node.children.forEach(child => {
      extractImages(child, images);
    });
  }
  
  return images;
}

const options = {
  hostname: 'api.figma.com',
  path: `/v1/files/${FILE_KEY}/nodes?ids=${encodeURIComponent(nodeId)}`,
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
      const nodeData = jsonData.nodes[nodeId];
      
      if (!nodeData) {
        console.error(`\n❌ Frame with ID "${nodeId}" not found.\n`);
        console.log('Available frames:');
        console.log('Run: node scripts/list-figma-frames.js\n');
        return;
      }
      
      const frame = nodeData.document;
      
      console.log('\n' + '='.repeat(60));
      console.log(`📐 FRAME: ${frame.name}`);
      console.log('='.repeat(60));
      console.log(`\nID: ${frame.id}`);
      console.log(`Type: ${frame.type}`);
      
      if (frame.absoluteBoundingBox) {
        const { x, y, width, height } = frame.absoluteBoundingBox;
        console.log(`\n📍 Position: x=${x}, y=${y}`);
        console.log(`📏 Size: ${width}x${height}px`);
      }
      
      // Extract text nodes
      const texts = extractTextNodes(frame);
      if (texts.length > 0) {
        console.log(`\n📝 Text Elements (${texts.length}):`);
        texts.forEach((text, i) => {
          console.log(`\n  ${i + 1}. "${text.name}"`);
          console.log(`     Content: "${text.characters}"`);
          if (text.style) {
            console.log(`     Font: ${text.style.fontFamily} ${text.style.fontWeight}`);
            console.log(`     Size: ${text.style.fontSize}px`);
          }
        });
      }
      
      // Extract images
      const images = extractImages(frame);
      if (images.length > 0) {
        console.log(`\n🖼️  Images (${images.length}):`);
        images.forEach((img, i) => {
          console.log(`\n  ${i + 1}. ${img.name}`);
          console.log(`     Image Ref: ${img.imageRef}`);
        });
      }
      
      // Show structure
      function showStructure(node, indent = 0) {
        const prefix = '  '.repeat(indent);
        const type = node.type || 'UNKNOWN';
        const name = node.name || 'Unnamed';
        console.log(`${prefix}${type}: ${name}`);
        
        if (node.children && Array.isArray(node.children)) {
          node.children.forEach(child => {
            showStructure(child, indent + 1);
          });
        }
      }
      
      console.log(`\n🏗️  Structure:`);
      showStructure(frame);
      
      console.log('\n' + '='.repeat(60) + '\n');
      
    } catch (error) {
      console.error('Error parsing response:', error.message);
      console.log('\nRaw response (first 1000 chars):');
      console.log(data.substring(0, 1000));
    }
  });
});

req.on('error', (error) => {
  console.error('Error fetching Figma frame:', error.message);
});

req.end();

