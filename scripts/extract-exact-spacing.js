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

function findFrameWithText(node, targetText, results = []) {
  const bbox = node.absoluteBoundingBox || {};
  
  // Check if this frame contains the target text
  function containsText(n) {
    if (n.type === 'TEXT' && n.name && n.name.includes(targetText)) {
      return true;
    }
    if (n.children) {
      for (const child of n.children) {
        if (containsText(child)) return true;
      }
    }
    return false;
  }
  
  if (node.type === 'FRAME' && containsText(node)) {
    results.push({
      name: node.name,
      spacing: node.itemSpacing || 0,
      padding: {
        left: node.paddingLeft || 0,
        right: node.paddingRight || 0,
        top: node.paddingTop || 0,
        bottom: node.paddingBottom || 0
      },
      width: bbox.width || 0
    });
  }
  
  if (node.children) {
    node.children.forEach(child => findFrameWithText(child, targetText, results));
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
    
    const desktopOrderDetails = findFrameWithText(desktopNode, 'Order Details');
    const desktopOrderItems = findFrameWithText(desktopNode, 'Order items');
    const mobileOrderDetails = findFrameWithText(mobileNode, 'Order Details');
    const mobileOrderItems = findFrameWithText(mobileNode, 'Order items');
    
    console.log('\n=== EXACT SPACING VALUES ===\n');
    
    console.log('DESKTOP:');
    if (desktopOrderDetails.length > 0) {
      console.log('Order Details Card spacing:', desktopOrderDetails[0].spacing + 'px');
    }
    if (desktopOrderItems.length > 0) {
      console.log('Order Items Card spacing:', desktopOrderItems[0].spacing + 'px');
    }
    
    console.log('\nMOBILE:');
    if (mobileOrderDetails.length > 0) {
      console.log('Order Details Card spacing:', mobileOrderDetails[0].spacing + 'px');
    }
    if (mobileOrderItems.length > 0) {
      console.log('Order Items Card spacing:', mobileOrderItems[0].spacing + 'px');
    }
  });
});

