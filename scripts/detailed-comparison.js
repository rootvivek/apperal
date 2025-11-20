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

function extractAllSpecs(node, specs = {}) {
  const bbox = node.absoluteBoundingBox || {};
  const name = node.name || '';
  const style = node.style || {};
  
  // Container
  if ((name === 'Frame 1' || name === 'Mobile') && node.type === 'FRAME') {
    specs.container = {
      padding: { left: node.paddingLeft || 0, right: node.paddingRight || 0, top: node.paddingTop || 0, bottom: node.paddingBottom || 0 },
      spacing: node.itemSpacing || 0
    };
  }
  
  // Success icon
  if (name.includes('image-') && node.type === 'RECTANGLE') {
    specs.successIcon = { width: bbox.width || 0, height: bbox.height || 0 };
  }
  
  // Heading
  if (name === 'Order Place Successfully!' && node.type === 'TEXT') {
    specs.heading = {
      fontSize: style.fontSize || 0,
      fontWeight: style.fontWeight || 0,
      lineHeight: style.lineHeightPx || 0,
      letterSpacing: style.letterSpacing || 0,
      fontFamily: style.fontFamily || ''
    };
  }
  
  // Thank you message
  if (name.includes('Thanks you') && node.type === 'TEXT') {
    specs.thankYouMessage = {
      fontSize: style.fontSize || 0,
      fontWeight: style.fontWeight || 0,
      lineHeight: style.lineHeightPx || 0,
      fontFamily: style.fontFamily || ''
    };
  }
  
  // Order Details Card
  if (name === 'Frame 2' && node.type === 'FRAME') {
    specs.orderDetailsCard = {
      padding: { left: node.paddingLeft || 0, right: node.paddingRight || 0, top: node.paddingTop || 0, bottom: node.paddingBottom || 0 },
      spacing: node.itemSpacing || 0
    };
  }
  
  // Order Details Heading
  if (name === 'Order Details' && node.type === 'TEXT') {
    specs.orderDetailsHeading = {
      fontSize: style.fontSize || 0,
      fontWeight: style.fontWeight || 0,
      lineHeight: style.lineHeightPx || 0,
      letterSpacing: style.letterSpacing || 0,
      fontFamily: style.fontFamily || ''
    };
  }
  
  // Order Details Row Text (Order Number, Date, Payment Method, Status)
  if ((name.includes('Order Number') || name.includes('Date :') || name.includes('Payment Method') || name.includes('Status :')) && node.type === 'TEXT') {
    if (!specs.orderDetailsRows) specs.orderDetailsRows = [];
    specs.orderDetailsRows.push({
      name: name,
      fontSize: style.fontSize || 0,
      fontWeight: style.fontWeight || 0,
      lineHeight: style.lineHeightPx || 0,
      fontFamily: style.fontFamily || ''
    });
  }
  
  // Order Items Card
  if (name === 'Frame 3' && node.type === 'FRAME') {
    specs.orderItemsCard = {
      padding: { left: node.paddingLeft || 0, right: node.paddingRight || 0, top: node.paddingTop || 0, bottom: node.paddingBottom || 0 },
      spacing: node.itemSpacing || 0
    };
  }
  
  // Order Items Heading
  if (name === 'Order items' && node.type === 'TEXT') {
    specs.orderItemsHeading = {
      fontSize: style.fontSize || 0,
      fontWeight: style.fontWeight || 0,
      lineHeight: style.lineHeightPx || 0,
      letterSpacing: style.letterSpacing || 0,
      fontFamily: style.fontFamily || ''
    };
  }
  
  // Product Image
  if (name === 'Frame 7' && node.type === 'FRAME') {
    specs.productImage = {
      width: bbox.width || 0,
      height: bbox.height || 0,
      padding: { left: node.paddingLeft || 0, right: node.paddingRight || 0, top: node.paddingTop || 0, bottom: node.paddingBottom || 0 }
    };
  }
  
  // Item Row Gap
  if (name === 'Frame 8' && node.type === 'FRAME') {
    specs.itemRow = { gap: node.itemSpacing || 0, align: node.counterAxisAlignItems || '' };
  }
  
  // Product Title
  if (name === 'Product Title' && node.type === 'TEXT') {
    specs.productTitle = {
      fontSize: style.fontSize || 0,
      fontWeight: style.fontWeight || 0,
      lineHeight: style.lineHeightPx || 0,
      fontFamily: style.fontFamily || ''
    };
  }
  
  // Price
  if (name.includes('Price :') && node.type === 'TEXT') {
    specs.price = {
      fontSize: style.fontSize || 0,
      fontWeight: style.fontWeight || 0,
      lineHeight: style.lineHeightPx || 0,
      fontFamily: style.fontFamily || ''
    };
  }
  
  // Date (in Order Items)
  if (name.includes('Date :') && node.type === 'TEXT' && bbox.x > 1800) {
    specs.date = {
      fontSize: style.fontSize || 0,
      fontWeight: style.fontWeight || 0,
      lineHeight: style.lineHeightPx || 0,
      fontFamily: style.fontFamily || ''
    };
  }
  
  // Payment Method (in Order Items)
  if (name.includes('Cash on') && node.type === 'TEXT') {
    specs.paymentMethod = {
      fontSize: style.fontSize || 0,
      fontWeight: style.fontWeight || 0,
      lineHeight: style.lineHeightPx || 0,
      fontFamily: style.fontFamily || ''
    };
  }
  
  if (node.children && Array.isArray(node.children)) {
    node.children.forEach(child => extractAllSpecs(child, specs));
  }
  
  return specs;
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
    
    const desktop = extractAllSpecs(desktopNode);
    const mobile = extractAllSpecs(mobileNode);
    
    console.log('\n=== DETAILED COMPARISON ===\n');
    
    console.log('DESKTOP:');
    console.log('  Container spacing:', desktop.container?.spacing);
    console.log('  Thank you: fontSize', desktop.thankYouMessage?.fontSize, 'lineHeight', desktop.thankYouMessage?.lineHeight);
    console.log('  Order Details card spacing:', desktop.orderDetailsCard?.spacing);
    console.log('  Order Details heading: fontSize', desktop.orderDetailsHeading?.fontSize, 'lineHeight', desktop.orderDetailsHeading?.lineHeight);
    if (desktop.orderDetailsRows) {
      desktop.orderDetailsRows.forEach(row => {
        console.log('  Order Details row (' + row.name + '): fontSize', row.fontSize, 'lineHeight', row.lineHeight);
      });
    }
    console.log('  Order Items card spacing:', desktop.orderItemsCard?.spacing);
    console.log('  Order Items heading: fontSize', desktop.orderItemsHeading?.fontSize, 'lineHeight', desktop.orderItemsHeading?.lineHeight);
    console.log('  Item row gap:', desktop.itemRow?.gap);
    console.log('  Product Title: fontSize', desktop.productTitle?.fontSize, 'lineHeight', desktop.productTitle?.lineHeight, 'fontWeight', desktop.productTitle?.fontWeight);
    console.log('  Price: fontSize', desktop.price?.fontSize, 'lineHeight', desktop.price?.lineHeight, 'fontWeight', desktop.price?.fontWeight);
    console.log('  Date: fontSize', desktop.date?.fontSize, 'lineHeight', desktop.date?.lineHeight, 'fontWeight', desktop.date?.fontWeight);
    console.log('  Payment Method: fontSize', desktop.paymentMethod?.fontSize, 'lineHeight', desktop.paymentMethod?.lineHeight, 'fontWeight', desktop.paymentMethod?.fontWeight);
    
    console.log('\nMOBILE:');
    console.log('  Container spacing:', mobile.container?.spacing);
    console.log('  Thank you: fontSize', mobile.thankYouMessage?.fontSize, 'lineHeight', mobile.thankYouMessage?.lineHeight);
    console.log('  Order Details card spacing:', mobile.orderDetailsCard?.spacing);
    console.log('  Order Details heading: fontSize', mobile.orderDetailsHeading?.fontSize, 'lineHeight', mobile.orderDetailsHeading?.lineHeight);
    if (mobile.orderDetailsRows) {
      mobile.orderDetailsRows.forEach(row => {
        console.log('  Order Details row (' + row.name + '): fontSize', row.fontSize, 'lineHeight', row.lineHeight);
      });
    }
    console.log('  Order Items card spacing:', mobile.orderItemsCard?.spacing);
    console.log('  Order Items heading: fontSize', mobile.orderItemsHeading?.fontSize, 'lineHeight', mobile.orderItemsHeading?.lineHeight);
    console.log('  Item row gap:', mobile.itemRow?.gap);
    console.log('  Product Title: fontSize', mobile.productTitle?.fontSize, 'lineHeight', mobile.productTitle?.lineHeight, 'fontWeight', mobile.productTitle?.fontWeight);
    console.log('  Price: fontSize', mobile.price?.fontSize, 'lineHeight', mobile.price?.lineHeight, 'fontWeight', mobile.price?.fontWeight);
    console.log('  Date: fontSize', mobile.date?.fontSize, 'lineHeight', mobile.date?.lineHeight, 'fontWeight', mobile.date?.fontWeight);
    console.log('  Payment Method: fontSize', mobile.paymentMethod?.fontSize, 'lineHeight', mobile.paymentMethod?.lineHeight, 'fontWeight', mobile.paymentMethod?.fontWeight);
  });
});

