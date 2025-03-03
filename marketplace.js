const express = require("express");
const router = express.Router();
const { db } = require("./db"); // Firestore database instance
const { v4: uuidv4 } = require('uuid'); 

// Add a Product (Admin Only)
router.post("/add", async (req, res) => {
  try {
    const { name, description, price, stock, category, imageUrl } = req.body;

    // Validate required fields
    if (!name || !description || !price || !stock || !category || !imageUrl) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields.",
      });
    }

    // Create product data
    const newProduct = {
      name,
      description,
      price,
      stock,
      category,
      imageUrl,
      createdAt: new Date().toISOString(),
    };

    // Save to Firestore
    const productRef = await db.collection("products").add(newProduct);

    return res.status(201).json({
      success: true,
      message: "Product added successfully.",
      product: { id: productRef.id, ...newProduct },
    });

  } catch (error) {
    console.error("Error adding product:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
});

// Update a Product
router.put("/update/:productId", async (req, res) => {
    try {
      const { productId } = req.params;
      const updatedData = req.body;
  
      // Reference to the product document
      const productRef = db.collection("products").doc(productId);
  
      // Check if product exists
      const productDoc = await productRef.get();
      if (!productDoc.exists) {
        return res.status(404).json({ success: false, message: "Product not found" });
      }
  
      // Update product
      await productRef.update(updatedData);
  
      res.status(200).json({ success: true, message: "Product updated successfully" });
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  });
  
// Delete a Product (Admin Only)
router.delete('/products/delete/:productId', async (req, res) => {
  try {
      const { productId } = req.params;

      // Check if the product exists
      const productRef = db.collection('products').doc(productId);
      const product = await productRef.get();

      if (!product.exists) {
          return res.status(404).json({ success: false, message: 'Product not found' });
      }

      // Delete the product
      await productRef.delete();

      res.status(200).json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
      console.error('Error deleting product:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
  }
});




// Get All Products (For Users)
router.get('/products', async (req, res) => {
  try {
      const productsRef = db.collection('products');
      const snapshot = await productsRef.get();

      if (snapshot.empty) {
          return res.status(404).json({ success: false, message: 'No products found' });
      }

      let products = [];
      snapshot.forEach(doc => {
          products.push({ id: doc.id, ...doc.data() });
      });

      res.status(200).json({ success: true, products });
  } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get Product Details (For Users)
router.get('/products/:productId', async (req, res) => {
  try {
      const { productId } = req.params;
      const productRef = db.collection('products').doc(productId);
      const productDoc = await productRef.get();

      if (!productDoc.exists) {
          return res.status(404).json({ success: false, message: 'Product not found' });
      }

      res.status(200).json({ success: true, product: { id: productDoc.id, ...productDoc.data() } });
  } catch (error) {
      console.error('Error fetching product details:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
  }
});
// Get Product Details (For Users)
router.get('/products/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const productRef = db.collection('products').doc(productId);
        const productDoc = await productRef.get();

        if (!productDoc.exists) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        res.status(200).json({ success: true, product: { id: productDoc.id, ...productDoc.data() } });
    } catch (error) {
        console.error('Error fetching product details:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});
// Get Product Details (For Users)
router.get('/products/:productId', async (req, res) => {
  try {
      const { productId } = req.params;
      const productRef = db.collection('products').doc(productId);
      const productDoc = await productRef.get();

      if (!productDoc.exists) {
          return res.status(404).json({ success: false, message: 'Product not found' });
      }

      res.status(200).json({ success: true, product: { id: productDoc.id, ...productDoc.data() } });
  } catch (error) {
      console.error('Error fetching product details:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
  }
});






// Place an Order
router.post('/orders/place', async (req, res) => {
  try {
      const { userId, products, totalPrice } = req.body;

      // Validate input
      if (!userId || !Array.isArray(products) || products.length === 0 || !totalPrice) {
          return res.status(400).json({ error: 'Invalid request. Missing required fields.' });
      }

      // Generate order ID
      const orderId = uuidv4();

      // Create order object
      const orderData = {
          orderId,
          userId,
          products,
          totalPrice,
          status: 'Pending', // Default status
          createdAt: new Date().toISOString()
      };

      // Save order to Firestore
      await db.collection('orders').doc(orderId).set(orderData);

      res.status(201).json({ message: 'Order placed successfully', order: orderData });
  } catch (error) {
      console.error('Error placing order:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Order Details
router.get('/orders/:orderId', async (req, res) => {
  try {
      const { orderId } = req.params;

      // Fetch order from Firestore
      const orderDoc = await db.collection('orders').doc(orderId).get();

      if (!orderDoc.exists) {
          return res.status(404).json({ error: 'Order not found' });
      }

      res.status(200).json({ order: orderDoc.data() });
  } catch (error) {
      console.error('Error fetching order:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
});


// Get User's Order History
router.get('/orders/history/:userId', async (req, res) => {
  try {
      const { userId } = req.params;

      // Fetch all orders of the user, sorted by createdAt (descending)
      const ordersSnapshot = await db.collection('orders')
          .where('userId', '==', userId)
          .orderBy('createdAt', 'desc')
          .get();

      const orders = ordersSnapshot.docs.map(doc => ({
          orderId: doc.id,
          ...doc.data()
      }));

      res.status(200).json({ orders });
  } catch (error) {
      console.error('Error fetching order history:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
});


// Cancel an Order
router.post('/orders/cancel/:orderId', async (req, res) => {
  try {
      const { orderId } = req.params;

      // Fetch the order
      const orderRef = db.collection('orders').doc(orderId);
      const orderDoc = await orderRef.get();

      if (!orderDoc.exists) {
          return res.status(404).json({ success: false, message: 'Order not found' });
      }

      const orderData = orderDoc.data();

      // Check if the order is already canceled
      if (orderData.status === 'canceled') {
          return res.status(400).json({ success: false, message: 'Order is already canceled' });
      }

      // Update order status to "canceled"
      await orderRef.update({ status: 'canceled' });

      res.status(200).json({ success: true, message: 'Order canceled successfully' });

  } catch (error) {
      console.error('Error canceling order:', error);
      res.status(500).json({ success: false, message: 'Failed to cancel order' });
  }
});


module.exports = router;
