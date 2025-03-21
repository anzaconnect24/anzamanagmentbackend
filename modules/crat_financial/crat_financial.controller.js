const { errorResponse, successResponse } = require("../../utils/responses")
const {CratFinancials,User} = require("../../models");
const getUrl = require("../../utils/cloudinary_upload");
const { sendEmail } = require("../../utils/send_email");
const path = require('path');
const fs = require('fs');

const createFinancial = async (req, res) => {
  console.log('in here 1');
  try {
    const body = req.body;
    const id = req.user.id;

    // Flatten the nested arrays in the body object
    const allItems = Object.values(body).flat();

    // Ensure allItems is an array
    if (!Array.isArray(allItems) || allItems.length === 0) {
      console.log('Invalid data format');
      return res.status(400).json({ message: 'Invalid data format' });
    }

    // Create records
    const responses = await Promise.all(
      allItems.map(item =>
        CratFinancials.create({
          userId: id,
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

  const getFinancialData = async (req, res) => {
    console.log('in here 2');
    try {
        const id = req.user.id;

        // Retrieve the data, including uuid and userId
        const response = await CratFinancials.findAll({
            where: {
                userId: id
            },
            attributes: ['uuid', 'userId', 'subDomain', 'score', 'rating','reviewer_comment','attachment', 'reviewCount', 'reviewer', 'comments']
        });

        successResponse(res, response);
    } catch (error) {
        errorResponse(res, error);
    }
}

const updateFinancialData = async (req, res) => {
    console.log('Update API triggered');
    try {
      const body = req.body;
      const id = req.user.id;

      // Ensure body is an object with arrays
      if (typeof body !== 'object' || Array.isArray(body)) {
        return res.status(400).json({ message: 'Invalid data format' });
      }
  
      const updatePromises = [];
      for (const section of Object.keys(body)) {
        for (const item of body[section]) {
          updatePromises.push(
            CratFinancials.update(
              {
                score: item.score,
                rating: item.rating,
                description: item.description,
                comments: item.comments
              },
              {
                where: {
                  userId: id,
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
      const { subDomain } = req.body; // Extract subDomain from the request body
      const id = req.user.id;
      let attachment = await getUrl(req);
     console.log(req.body)


      // Find the application by subDomain
      const application = await CratFinancials.findOne({
          where: {
              subDomain,
              userId: id
          }
      });


      if (!application) {
        console.log(subDomain);
        console.log(attachment);
          return res.status(404).json({ message: 'Application not found' });
      }

      console.log(attachment);
      // Update the record with the new attachment URL
      const response = await CratFinancials.update({
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
    const { subDomain, attachment } = req.body; // Extract subDomain, userId, and attachment from the request body
    const id = req.user.id;

    console.log(req.body);

    // Find the application by subDomain and userId
    const application = await CratFinancials.findOne({
      where: {
        subDomain,
        userId: id,
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
    await CratFinancials.update(
      { attachment: null },
      { where: { subDomain, userId: id } }
    );

    res.json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    res.status(500).json({ message: 'Error deleting attachment' });
  }
};


module.exports = {
    createFinancial,getFinancialData,updateFinancialData,createPdfAttachment, deletePdfAttachment
}