const mongo = require('./mongo')

module.exports = async (mainCollection, data) => {
    const db = await mongo()
    const tempCollection = `${mainCollection}-temp`
    const previousCollection = `${mainCollection}-previous`

    // Get collections to check for existence
    const collections = (await db.listCollections().toArray()).map(col => col.name)
    

    // Create the temp collection
    {
        const collection = db.collection(tempCollection)
        // If exists - drop it
        if (collections.includes(tempCollection)) await collection.drop()
        // Then write the new one, with all the data
        await collection.insertMany(data)
    }
    // Drop previous if exists
    {
        const collection = db.collection(previousCollection)
        if (collections.includes(previousCollection)) await collection.drop()
    }
    // Rename main to previous
    {
        const collection = db.collection(mainCollection)
        if (!collections.includes(mainCollection)) await collection.insertOne({ msg: 'Æ træng å eksistere' })
        await collection.rename(previousCollection)
    }
    // Rename temp to main
    {
        const collection = db.collection(tempCollection)
        const rename = await collection.rename(mainCollection)
    }

    return `Switched mainCollection: ${mainCollection}. New mainCollection now consists of ${data.length} elements.`
}

