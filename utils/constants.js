const internalError = (error) => {
  res.status(500).json({
    status: false,
    message: "Internal server error",
    error: error
  });
};

const successResponse = (data) => {
  res.status(200).json({
    status: true,
    data: data
  });
};
module.exports = {
  internalError,
  successResponse
};
