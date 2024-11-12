const AWS = require('aws-sdk');
const crypto = require('crypto');
const S3 = new AWS.S3();
const BUCKET_NAME = process.env.BUCKET_NAME;

exports.uploadProfilePicture = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2));

    let file;
    try {
        const body = JSON.parse(event.body);
        file = body.file;
    } catch (error) {
        console.error('Error parsing JSON:', error);
        return {
            statusCode: 400,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            body: JSON.stringify({ error: 'Invalid JSON' }),
        };
    }

    if (!file) {
        console.warn('No file provided');
        return {
            statusCode: 400,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            body: JSON.stringify({ error: 'No file provided' }),
        };
    }

    const base64Data = file.split(',')[1];
    const contentType = file.split(';')[0].split(':')[1];

    // Hash the image
    const hash = crypto.createHash('md5').update(Buffer.from(base64Data, 'base64')).digest('hex');
    console.log('Image hash:', hash);

    // Create a unique filename based on content type and hash
    const filename = `profile-pictures/${hash}_profile_picture.${contentType.split('/')[1]}`;

    // Check if the file already exists
    const params = {
        Bucket: BUCKET_NAME,
        Key: filename,
    };

    try {
        await S3.headObject(params).promise(); // Check if the object exists
        console.log('File already exists:', filename);
        const imageUrl = `https://${BUCKET_NAME}.s3.amazonaws.com/${filename}`;
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            body: JSON.stringify({ message: 'File already exists', imageUrl }),
        };
    } catch (error) {
        if (error.code !== 'NotFound') {
            console.error('Error checking file existence:', error);
            return {
                statusCode: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                },
                body: JSON.stringify({ error: 'Could not check file existence', details: error.message }),
            };
        }
    }

    // If the file doesn't exist, proceed to upload
    const uploadParams = {
        Bucket: BUCKET_NAME,
        Key: filename,
        Body: Buffer.from(base64Data, 'base64'),
        ContentType: contentType,
    };

    try {
        await S3.upload(uploadParams).promise();
        const imageUrl = `https://${BUCKET_NAME}.s3.amazonaws.com/${filename}`;
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            body: JSON.stringify({ message: 'Upload Successful', imageUrl }),
        };
    } catch (error) {
        console.error('Upload failed:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            body: JSON.stringify({ error: 'Could not upload image', details: error.message }),
        };
    }
};
