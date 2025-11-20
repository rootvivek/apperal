const https = require('https');

const FIGMA_API_KEY = process.env.FIGMA_API_KEY || '';
const FILE_KEY = 'GlAxWG5CIynQR60Tgupefx';

function fetchNode(nodeId, callback) {
  const options = {
    hostname: 'api.figma.com',
    path: `/v1/files/${FILE_KEY}/nodes?ids=${nodeId}`,
    method: 'GET',
    headers: { 'X-Figma-Token': FIGMA_API_KEY }
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const jsonData = JSON.parse(data);
        callback(null, jsonData.nodes[nodeId].document);
      } catch (error) {
        callback(error, null);
      }
    });
  });
  req.on('error', (error) => callback(error, null));
  req.end();
}

function analyzeFrame2(node, indent = '') {
  const bbox = node.absoluteBoundingBox || {};
  
  console.log(`${indent}${node.name || 'Unknown'} (${node.type})`);
  console.log(`${indent}  Layout: ${node.layoutMode || 'NONE'}`);
  console.log(`${indent}  Spacing: ${node.itemSpacing || 0}px`);
  console.log(`${indent}  Padding: L:${node.paddingLeft || 0} R:${node.paddingRight || 0} T:${node.paddingTop || 0} B:${node.paddingBottom || 0}`);
  console.log(`${indent}  Size: ${bbox.width || 0}x${bbox.height || 0}`);
  console.log(`${indent}  Position: x:${bbox.x || 0} y:${bbox.y || 0}`);
  if (node.counterAxisAlignItems) {
    console.log(`${indent}  Align: ${node.counterAxisAlignItems}`);
  }
  console.log();
  
  if (node.children) {
    node.children.forEach(child => {
      if (child.name === 'Frame 2' || child.name === 'Frame 16' || child.name === 'Frame 8' || child.name === 'Frame 9' || child.name === 'Frame 10' || child.name === 'Frame 12' || child.name === 'Frame 3' || child.name === 'Order items' || child.name === 'Order Details' || child.name === 'Rectangle 1') {
        analyzeFrame2(child, indent + '  ');
      }
    });
  }
}

fetchNode('1:2', (err, desktopNode) => {
  if (err) {
    console.error('Error:', err.message);
    return;
  }
  
  // Find Frame 2
  function findFrame2(node) {
    if (node.name === 'Frame 2') {
      return node;
    }
    if (node.children) {
      for (const child of node.children) {
        const result = findFrame2(child);
        if (result) return result;
      }
    }
    return null;
  }
  
  const frame2 = findFrame2(desktopNode);
  if (frame2) {
    console.log('=== FRAME 2 STRUCTURE (Desktop) ===\n');
    analyzeFrame2(frame2);
  } else {
    console.log('Frame 2 not found');
  }
});

