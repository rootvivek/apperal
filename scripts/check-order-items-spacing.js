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

function findOrderItemsFrame(node, results = []) {
  const bbox = node.absoluteBoundingBox || {};
  
  // Look for Frame 3 that contains "Order items" text
  if (node.type === 'FRAME' && node.name === 'Frame 3') {
    // Check if this Frame 3 contains "Order items" text
    function hasOrderItemsText(n) {
      if (n.type === 'TEXT' && n.name === 'Order items') return true;
      if (n.children) {
        for (const child of n.children) {
          if (hasOrderItemsText(child)) return true;
        }
      }
      return false;
    }
    
    if (hasOrderItemsText(node)) {
      results.push({
        name: node.name,
        padding: {
          left: node.paddingLeft || 0,
          right: node.paddingRight || 0,
          top: node.paddingTop || 0,
          bottom: node.paddingBottom || 0
        },
        spacing: node.itemSpacing || 0,
        width: bbox.width || 0,
        height: bbox.height || 0
      });
    }
  }
  
  if (node.children) {
    node.children.forEach(child => findOrderItemsFrame(child, results));
  }
  
  return results;
}

fetchNode('1:2', (err, desktopNode) => {
  if (err) {
    console.error('Desktop error:', err.message);
    return;
  }
  
  fetchNode('8:4', (err, mobileNode) => {
    if (err) {
      console.error('Mobile error:', err.message);
      return;
    }
    
    const desktopFrames = findOrderItemsFrame(desktopNode);
    const mobileFrames = findOrderItemsFrame(mobileNode);
    
    console.log('\n=== ORDER ITEMS CARD SPACING ===\n');
    
    if (desktopFrames.length > 0) {
      console.log('DESKTOP Order Items Card (Frame 3):');
      desktopFrames.forEach(f => {
        console.log(`  Padding: L:${f.padding.left} R:${f.padding.right} T:${f.padding.top} B:${f.padding.bottom}px`);
        console.log(`  Spacing (gap): ${f.spacing}px`);
        console.log(`  Size: ${f.width}x${f.height}px`);
      });
    }
    
    if (mobileFrames.length > 0) {
      console.log('\nMOBILE Order Items Card (Frame 3):');
      mobileFrames.forEach(f => {
        console.log(`  Padding: L:${f.padding.left} R:${f.padding.right} T:${f.padding.top} B:${f.padding.bottom}px`);
        console.log(`  Spacing (gap): ${f.spacing}px`);
        console.log(`  Size: ${f.width}x${f.height}px`);
      });
    }
  });
});

