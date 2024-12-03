const { errorResponse, successResponse } = require("../../utils/responses")
const {CratMarkets,User} = require("../../models");
const getUrl = require("../../utils/cloudinary_upload");
const { sendEmail } = require("../../utils/send_email");
const path = require('path');
const fs = require('fs');

const createMarket = async (req, res) => {
  console.log('in here 1');
  try {
    const body = req.body;
    console.log('this is my body', body);

    const user = req.user;
    console.log('this is user', user);

    // Flatten the nested arrays in the body object
    const allItems = Object.values(body).flat();
    
    // Ensure allItems is an array
    if (!Array.isArray(allItems) || allItems.length === 0) {
      return res.status(400).json({ message: 'Invalid data format' });
    }

    // Create records
    const responses = await Promise.all(
      allItems.map(item =>
        CratMarkets.create({
          userId: user.id,
          subDomain: item.subDomain,
          score: item.score,
          rating: item.rating,
        })
      )
    );

    successResponse(res, responses);
  } catch (error) {
    // Send error response
    errorResponse(res, error);
  }
};

  
  
  const getMarketData = async (req, res) => {
    console.log('in here 2');
    try {
        const user = req.user;

        // Retrieve the data, including uuid and userId
        const response = await CratMarkets.findAll({
            where: {
                userId: user.id
            },
            attributes: ['uuid', 'userId', 'subDomain', 'score', 'rating', 'reviewCount', 'comments']
        });

        successResponse(res, response);
    } catch (error) {
      console.log(error);
        errorResponse(res, error);
    }
}


const updateMarketData = async (req, res) => {
    console.log('Update API triggered');
    try {
      const body = req.body;
      const user = req.user;
  
      console.log(body);
  
      // Ensure body is an object with arrays
      if (typeof body !== 'object' || Array.isArray(body)) {
        return res.status(400).json({ message: 'Invalid data format' });
      }
  
      // Collect all items to update
      const updatePromises = [];
      for (const section of Object.keys(body)) {
        for (const item of body[section]) {
          updatePromises.push(
            CratMarkets.update(
              {
                score: item.score,
                rating: item.rating,
                description: item.description
              },
              {
                where: {
                  userId: user.id,
                  subDomain: item.subDomain,
                },
              }
            )
          );
        }
      }
  
      const responses = await Promise.all(updatePromises);  
      successResponse(res, responses);
      console.log('Update successful:', responses);
    } catch (error) {
      errorResponse(res, error);
      console.error('Error updating data:', error);
    }
  };


const createPdfAttachment = async (req, res) => {
  console.log('trying attachment');
  try {
      const { subDomain, userId } = req.body; // Extract subDomain from the request body
      let attachment = await getUrl(req);
     console.log(req.body)


      // Find the application by subDomain
      const application = await CratMarkets.findOne({
          where: {
              subDomain,
              userId: userId
          }
      });


      if (!application) {
        console.log(subDomain);
        console.log(attachment);
          return res.status(404).json({ message: 'Application not found' });
      }

      console.log(attachment);
      // Update the record with the new attachment URL
      const response = await CratMarkets.update({
          attachment: attachment,
      }, {
          where: {
              subDomain // Ensure that only the correct record is updated
          }
      });

      successResponse(res, response);
  } catch (error) {
      errorResponse(res, error);
  }
};
  
const deletePdfAttachment = async (req, res) => {
  console.log('delete api');
  try {
    const { subDomain, userId, attachment } = req.body; // Extract subDomain, userId, and attachment from the request body

    console.log(req.body);

    // Find the application by subDomain and userId
    const application = await CratMarkets.findOne({
      where: {
        subDomain,
        userId,
      }
    });

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // attachment has the URL, so extract the file name from the URL if necessary
    // For example: if attachment is "localhost:5001/files/testpdf.pdf", we need to extract "testpdf.pdf"
    const attachmentFileName = path.basename(attachment); // Extract file name from URL
    const attachmentPath = path.join(__dirname, '../../files/', attachmentFileName);
    console.log(attachmentPath);

    // Remove the file from the filesystem
    if (fs.existsSync(attachmentPath)) {
      fs.unlinkSync(attachmentPath);
      console.log(`File ${attachmentPath} deleted successfully.`);
    } else {
      console.log(`File ${attachmentPath} does not exist.`);
    }

    // Remove the attachment record from the database
    await CratMarkets.update(
      { attachment: null },
      { where: { subDomain, userId } }
    );

    res.json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    res.status(500).json({ message: 'Error deleting attachment' });
  }
};


module.exports = {
    createMarket,getMarketData,updateMarketData,createPdfAttachment, deletePdfAttachment
}