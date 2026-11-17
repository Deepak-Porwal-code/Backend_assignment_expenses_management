const asyncHandler = require('../utils/asyncHandler');
const { getAnalytics } = require('../services/analyticsService');

const overview = asyncHandler(async (req, res) => {
  const analytics = await getAnalytics(req.user._id, req.validated.query.range);
  res.json(analytics);
});

module.exports = { overview };
