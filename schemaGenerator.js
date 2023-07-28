// The file contains only 
const data = require('./schemaorg-all-https.json');
const baseURL = "https://schema.org/";
const schemaTemplate = {
};

// Filter out all of the schema types present in the file data
schemaTypes = data['@graph'].filter(item => {
    return item['@type'] == 'rdfs:Class' && item['rdfs:subClassOf'] && item['rdfs:subClassOf']['@id'] !== 'schema:Enumeration';
})

// Function is to collate all of the enumeration values of an enum
const getEnumerations = (x) => {
    let enumArray =[];
    let msg = 'Data type is another schema type';
    data['@graph'].forEach(item => {
        if(item['@id'] === x){
            if(item['@type'] === 'rdfs:Class' && item['rdfs:subClassOf'] && item['rdfs:subClassOf']['@id'] === 'schema:Enumeration'){
                enumArray = data['@graph'].filter(item => item['@type'] === x)
                .map(item => {
                    return item['rdfs:label'];
                })
            }
        }
    })
    return enumArray
}

// Data types' mapping from JSON-LD to JSON schema
const checkDataType = (x) => {
    const tempType = {};
    switch(x.join()){
        case "schema:Text" :
            tempType['type'] = "string";
            break;
        case "schema:Number": 
            tempType['type'] = "number";
            break;
        case "schema:DateTime": 
            tempType['type'] = "string";
            tempType['format'] = "date";
            break;
        case "schema:Time":
            tempType['type'] = "string";
            tempType['format'] = "date-time";
            break;
        case "schema:Boolean": 
            tempType['type'] = "boolean";
            break;
        case "schema:Date":
            tempType['type'] = "string";
            tempType['format'] = "date";
            break;
        case "schema:Integer": "integer"
            tempType['type'] = "integer";
            break;
        default:
            const result = getEnumerations(x.join())
            result.length?
                tempType['enum'] = result:
            console.log('RangeInclude contain another Schema type');
    }
    return tempType;
} 

// console.log('----Number of Schema Types', schemaTypes.length)
/**
 * 
 * @param {object} schemaProperties an array of properties of a schema type
 * @returns {object} properties an object consists of property name and its type 
 */

const getPropertyType = (schemaProperties) => {
    let properties = {};
    schemaProperties.forEach(prop => {
        properties[prop['rdfs:label']] ={};
        properties[prop['rdfs:label']]['description'] = prop['rdfs:comment'];
        
        // If rangeIncludes contain more than 1 data types
        if(Array.isArray(prop['schema:rangeIncludes'])){
            properties[prop['rdfs:label']]['oneOf'] =[];
            prop['schema:rangeIncludes'].forEach(item => {
                propertyType = checkDataType(Object.values(item));
                if(Object.keys(propertyType).length !== 0){
                    properties[prop['rdfs:label']]['oneOf'].push(propertyType);
                }
            })
        }
        else{
            propertyType = checkDataType(Object.values(prop['schema:rangeIncludes']))
            properties[prop['rdfs:label']] = {...properties[prop['rdfs:label']], ...propertyType};
        }
    })
    return properties;
}

/**
 * 
 * @param {string} typeName name of the schema type
 * @returns 
 */

const getProperties = typeName => {
    console.log('typeName----------->', typeName)
    const schemaProperties = data['@graph'].filter(item => {
        const domainIncludes = item['schema:domainIncludes'];
        if(item['@type'] == 'rdf:Property'){
            // console.log('-------------------item[@type]>>>>>>>>>>',item['@type'])
            if(Array.isArray(domainIncludes)){
                return domainIncludes.some(item => item['@id'] === typeName);
            }
            else {
                console.log('item to review------', item)
                return domainIncludes && domainIncludes['@id'] === typeName;
            }
        }
    })
    console.log('-----------schemaProperties---', schemaProperties)
    return getPropertyType(schemaProperties);
}

/**
 * @function getJSONschema
 * @param {object} type schema type 
 */

const getJSONschema = type => {
    schemaTemplate['$id'] = baseURL+type['rdfs:label']+'.json'
    schemaTemplate['title'] = type['rdfs:label'];
    schemaTemplate['description'] = type['rdfs:comment']
    if(type['rdfs:subClassOf']){
        schemaTemplate['allOf'] = [];
        // If the current type is subclass of more than 1 classes
        if(Array.isArray(type['rdfs:subClassOf'])){
            type['rdfs:subClassOf'].forEach(item => {
                schemaTemplate.allOf.push({'$ref':Object.values(item)+'.json'})
            })
        }
        else{
            schemaTemplate.allOf.push({'$ref':Object.values(type['rdfs:subClassOf'])+'.json'})
        }
    }
    schemaTemplate['type'] = 'object'
    schemaTemplate['properties'] = getProperties(type['@id'])
    return schemaTemplate;
}

// Add the JSON schema generated in a collated schemas' file
const saveJSONSchema = (typeName) => {
    console.log('----received type in save function---', typeName)
    const fs = require('fs');
    // const file = fs.readFileSync('outputSchemas.json')
    // if (file.length == 0) {
        const schemaVersion = {"$schema": "https://json-schema.org/draft/2020-12/schema"};
        const updatedContent = Object.assign({},schemaVersion, schemaTemplate )
        try{
            fs.writeFileSync(`./OutputFiles/${typeName}.json`, JSON.stringify(updatedContent));
        }
        catch(err){
            console.log(err);
        }
    // } else {
    //     var fileContent = JSON.parse(file);
    //     var updatedContent = Object.assign({}, fileContent, schemaTemplate);
    //     try{
    //         fs.writeFileSync("outputSchemas.json", JSON.stringify(updatedContent));
    //         console.log("JSON schema saved in the output file");
    //     }
    //     catch(err){
    //         console.log(err);
    //     }
    // }
}

// For every schema type, fetch the JSON schema and save it
schemaTypes.forEach(type => {
    const res = getJSONschema(type);
    console.log('--------result of getJSONSchema', res);
    saveJSONSchema(type['rdfs:label']);
});
