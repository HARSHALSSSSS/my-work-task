const { successResponse, errorResponse } = require('../../../../shared/utils/response');

/**
 * Get flash sale timer data
 */
const getFlashSaleTimer = async (req, res) => {
  try {
    // Calculate end time (6 hours from now for demo)
    const now = new Date();
    const endTime = new Date(now.getTime() + (6 * 60 * 60 * 1000)); // 6 hours from now
    
    // Calculate remaining time
    const timeDiff = endTime.getTime() - now.getTime();
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

    const flashSaleData = {
      isActive: timeDiff > 0,
      endTime: endTime.toISOString(),
      timeRemaining: {
        hours: Math.max(0, hours),
        minutes: Math.max(0, minutes),
        seconds: Math.max(0, seconds)
      },
      discount: {
        percentage: 30,
        maxAmount: 500
      },
      title: "Flash Sale is Live",
      subtitle: "Limited time offers on selected items"
    };

    return successResponse(res, flashSaleData, 'Flash sale timer retrieved successfully');
  } catch (error) {
    console.error('Flash sale timer error:', error);
    return errorResponse(res, 'Failed to get flash sale timer', 500);
  }
};

/**
 * Get flash sale products
 */
const getFlashSaleProducts = async (req, res) => {
  try {
    // Mock flash sale products for now
    const flashSaleProducts = [
      {
        id: 'flash-1',
        name: 'Premium Leather Planners',
        originalPrice: 85,
        salePrice: 45,
        discount: 47,
        image: '/Organized-workspace-optimized.jpg',
        category: 'stationery'
      },
      {
        id: 'flash-2', 
        name: 'Custom Water Bottles',
        originalPrice: 40,
        salePrice: 28,
        discount: 30,
        image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500&q=80',
        category: 'gifting'
      },
      {
        id: 'flash-3',
        name: 'Business Card Sets',
        originalPrice: 25,
        salePrice: 18,
        discount: 28,
        image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&q=80',
        category: 'business'
      }
    ];

    return successResponse(res, { products: flashSaleProducts }, 'Flash sale products retrieved successfully');
  } catch (error) {
    console.error('Flash sale products error:', error);
    return errorResponse(res, 'Failed to get flash sale products', 500);
  }
};

module.exports = {
  getFlashSaleTimer,
  getFlashSaleProducts
};