const https = require('https');

const FIGMA_API_KEY = process.env.FIGMA_API_KEY || '';
const FILE_KEY = 'GlAxWG5CIynQR60Tgupefx';

function findFrames(node, path = '', frames = []) {
  const name = node.name || '';
  const nodeType = node.type || '';
  const nodeId = node.id || '';
  
  if (nodeType === 'FRAME') {
    frames.push({
      id: nodeId,
      name: name,
      path: path,
      absoluteBoundingBox: node.absoluteBoundingBox
    });
  }
  
  if (node.children && Array.isArray(node.children)) {
    node.children.forEach(child => {
      const newPath = path ? `${path}/${name}` : name;
      findFrames(child, newPath, frames);
    });
  }
  
  return frames;
}

const options = {
  hostname: 'api.figma.com',
  path: `/v1/files/${FILE_KEY}`,
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
      const frames = findFrames(jsonData.document);
      
      console.log('\n=== Available Frames in Figma ===\n');
      frames.forEach((frame, index) => {
        console.log(`${index + 1}. ${frame.name}`);
        console.log(`   ID: ${frame.id}`);
        console.log(`   Path: ${frame.path || 'Root'}`);
        if (frame.absoluteBoundingBox) {
          console.log(`   Size: ${frame.absoluteBoundingBox.width}x${frame.absoluteBoundingBox.height}`);
        }
        console.log('');
      });
      
      console.log(`\nTotal frames found: ${frames.length}`);
      console.log('\nTo view a specific frame, copy its node-id from the URL when selected in Figma.');
      console.log('Example: If URL shows node-id=1-123, use "1-123" as the node ID.\n');
    } catch (error) {
      console.error('Error parsing response:', error.message);
      console.log('\nRaw response (first 500 chars):');
      console.log(data.substring(0, 500));
    }
  });
});

req.on('error', (error) => {
  console.error('Error fetching Figma file:', error.message);
});

req.end();

