const errorResponse = (res, error) => {
  res.status(500).json({
    status: false,
    message: "Internal server error",
    error: error
  });
  console.log(error);
};

const successResponse = (res, response) => {
  res.status(200).json({
    status: true,
    body: response
  });
};

module.exports = { errorResponse, successResponse };
