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

function findCardFrame(node, cardName, results = []) {
  // Look for Frame 2 (Order Details) or Frame 3 (Order Items)
  if (node.type === 'FRAME' && (node.name === 'Frame 2' || node.name === 'Frame 3')) {
    // Check if this frame contains the card name text
    function containsCardName(n) {
      if (n.type === 'TEXT' && n.name && n.name.includes(cardName)) {
        return true;
      }
      if (n.children) {
        for (const child of n.children) {
          if (containsCardName(child)) return true;
        }
      }
      return false;
    }
    
    if (containsCardName(node)) {
      // Find the heading and first content row to calculate gap
      let headingY = null;
      let firstContentY = null;
      
      function findElements(n) {
        if (n.type === 'TEXT' && n.name && n.name.includes(cardName)) {
          headingY = n.absoluteBoundingBox?.y || null;
        }
        if (n.type === 'FRAME' && n.name && (n.name.includes('Order Number') || n.name.includes('Product Title'))) {
          if (firstContentY === null) {
            firstContentY = n.absoluteBoundingBox?.y || null;
          }
        }
        if (n.children) {
          n.children.forEach(child => findElements(child));
        }
      }
      
      findElements(node);
      
      const gap = headingY !== null && firstContentY !== null ? firstContentY - headingY - (node.absoluteBoundingBox?.y || 0) : null;
      
      results.push({
        name: node.name,
        cardName: cardName,
        spacing: node.itemSpacing || 0,
        calculatedGap: gap,
        headingY: headingY,
        firstContentY: firstContentY
      });
    }
  }
  
  if (node.children) {
    node.children.forEach(child => findCardFrame(child, cardName, results));
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
    
    const desktopOrderDetails = findCardFrame(desktopNode, 'Order Details');
    const desktopOrderItems = findCardFrame(desktopNode, 'Order items');
    const mobileOrderDetails = findCardFrame(mobileNode, 'Order Details');
    const mobileOrderItems = findCardFrame(mobileNode, 'Order items');
    
    console.log('\n=== CARD SPACING ANALYSIS ===\n');
    
    console.log('DESKTOP:');
    desktopOrderDetails.forEach(f => {
      console.log(`Order Details (${f.name}): itemSpacing=${f.spacing}px`);
    });
    desktopOrderItems.forEach(f => {
      console.log(`Order Items (${f.name}): itemSpacing=${f.spacing}px`);
    });
    
    console.log('\nMOBILE:');
    mobileOrderDetails.forEach(f => {
      console.log(`Order Details (${f.name}): itemSpacing=${f.spacing}px`);
    });
    mobileOrderItems.forEach(f => {
      console.log(`Order Items (${f.name}): itemSpacing=${f.spacing}px`);
    });
  });
});

