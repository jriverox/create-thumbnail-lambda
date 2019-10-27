const AWS = require('aws-sdk');
const util = require('util');
const sharp = require('sharp');

const MAX_WIDTH  = 100;
const MAX_HEIGHT = 100;

//Instanciar el cliente de S3
const s3 = new AWS.S3();

exports.handler = async (event, context) => {
    console.log("Leyendo el evento:\n", util.inspect(event, {depth: 5}));

    const sourceBucket = event.Records[0].s3.bucket.name;
    const sourceObject = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));
    const destinyBucket = process.env.DESTINY_BUCKET || `${sourceBucket}-resized`;
    
    //Validaciones
    const typeMatch = sourceObject.match(/\.([^.]*)$/);    
    if (!typeMatch) {
        console.log("No se puede derminar el tipo de archivo.");
        return;
    }
    var imageType = typeMatch[1].toLowerCase();
    if (imageType != "jpg" && imageType != "png") {
        console.log(`Archivo debe ser jpg o png, el tipo: ${imageType} no es soportado.`);
        return;
    }
    //Obtener la imagen original recien subida al bucket de S3
    let data = await s3.getObject({ 
        Bucket: sourceBucket,
        Key: sourceObject,
    }).promise();
    
    //Hacer el resize de la imagen original con la libreria sharp
    const destinyObject = `resized-${sourceObject}`;
    const thumbnail = await sharp(data.Body)
        .resize({width: MAX_WIDTH, height: MAX_HEIGHT })
        .toBuffer();
 
    //Guardar la imagen transformada en el Bucket destino
    data = await s3.putObject({
        Bucket: destinyBucket,
        Key: destinyObject,
        Body: thumbnail
    }).promise();

    //retornar una respuesta para que se logeee en Cloudwatch
    const response = {
        statusCode: 200,
        body: JSON.stringify(data),
    };
    return response;
}