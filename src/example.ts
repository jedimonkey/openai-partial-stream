import OpenAI from "openai";
import { z } from "zod";
import { readFileParseContent, genPromptSchema, handleOpenAiResponse, handleOpenAiResponse3, readFileAndStreamContent, handleMockResponse } from "./index.js";

import { StreamMode } from "./utils.js";

import { OpenAiHandler } from "./openAiHandler.js";

import { Entity } from "./entity.js";

// Interface for developer how to use this library


// Setps:
// Import openai library
// Set an instance of openai
// Use stream
// Create an enity, with interface or zod schema
// Transform the zod schema to a json object
// Add to the prompt the json object and instruction
// Send the prompt to openai
// Send the stream to the parser


// const openai = "";

// import { readFileParseContent } from "./src/readFileParseContent";

// Import the file from ./src/readFileParseContent


// Schema

const PostCodeSchema = z.object({
    postcode: z.string().optional(),
    councilName: z.string().optional(),
    country: z.string().optional(),
});

const ColorSchema = z.object({
    hex: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
});

// Exmaple
// {
//     "name": "Coffea arabica",
//     "common_name": "Arabica",
//     "production_percentage": "60-70%",
//     "characteristics": [
//        "Smooth, mild flavor",
//        "Aromatic qualities",
//        "Less caffeine than Robusta"
//     ],
//     "sub_varieties": ["Typica", "Bourbon", "Geisha", "SL28"]
//  },
const CoffeeOrigin = z.object({
    name: z.string().optional(),
    common_name: z.string().optional(),
    production_percentage: z.string().optional(),
    characteristics: z.array(z.string()).optional(),
    sub_varieties: z.array(z.string()).optional(),
});

type PostCode = z.infer<typeof PostCodeSchema>;
type Color = z.infer<typeof ColorSchema>;
type CoffeeOrigin = z.infer<typeof CoffeeOrigin>;


// API call

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});


function getCoffeeMessages(entity: Entity): any[] {
    return [
        {
            role: "system",
            content: "Write JSON only"
        },
        {
            role: "user",
            content: "Give me a list of 5 coffee origin with their name, common name, production percentage, characteristics and sub varieties."
        },
        {
            role: "user",
            content: entity.generatePromptSchema(),
        },
    ];
}

function getColorMessages(entity: Entity): any[] {
    return [
        {
            role: "system",
            content: "Write JSON only"
        },
        {
            role: "user",
            content: "Give me a palette of 3 gorgeous color with the hex code, name and a description."
        },
        // {
        //     role: "user",
        //     content: entity.generatePromptSchema(),
        // },
    ];
}

function getColorFunction() {
    return {
        name: "addColors",
        description: "Add a list of color",
        parameters: {
            type: "object",
            properties: {
                hex: {
                    type: "string",
                    description: "The hexadecimal code of the color"
                },
                name: {
                    type: "string",
                    description: "The color name"
                },
                description: {
                    type: "string",
                    description: "The description of the color"
                }
            }
        }
    }
}

function getColorListFunction() {
    return {
        name: "give_colors",
        description: "Give a list of color",
        parameters: {
            type: "object",
            properties: {
                colors: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            hex: {
                                type: "string",
                                description: "The hexadecimal code of the color"
                            },
                            name: {
                                type: "string",
                                description: "The color name"
                            },
                            description: {
                                type: "string",
                                description: "The description of the color"
                            }
                        }
                    }
                }
            }
        },
    }
}

export async function callGenerateColors(mode: StreamMode = StreamMode.StreamObjectKeyValueTokens) {

    const entity = new Entity("colors", ColorSchema);
    const entityPostCode = new Entity("PostCode", PostCodeSchema);
    const entityCoffee = new Entity("CoffeeOrigin", CoffeeOrigin);

    const stream = await openai.chat.completions.create({
        messages: getColorMessages(entity),
        model: "gpt-3.5-turbo",
        // model: "gpt-4",
        stream: true, // ENABLE STREAMING
        // temperature: 0.7,
        temperature: 1.3,
        // temperature:s 2,

        // Functions:
        functions: [
            // getColorFunction(),
            getColorListFunction(),
        ],
        function_call: {name: "give_colors"}

    });


    console.log(entity.generatePromptSchema());


    // Parser
    // API proposal:
    // const entityStream = streamParser(stream, PostCodeSchema);

    // const entityStream = handleOpenAiResponse(stream, ColorSchema, mode);
    
    // Version 2
    // const entityStream = handleOpenAiResponse2(stream, ColorSchema, mode);

    // Version 3
    // const entityStream = handleOpenAiResponse3(stream, ColorSchema, mode);

    // Version 4

    const openAiHandler = new OpenAiHandler(mode);
    const entityStream = openAiHandler.process(stream);


    // return entityStream;
    // COLOR
    // const colorEntityStream = entity.genParse(entityStream);
    const entityColors = new Entity("colors", ColorSchema);
    const colorEntityStream = entityColors.genParseArray(entityStream);

    // const entityPostCode = new Entity("PostCode", PostCodeSchema);
    // const postCodeStream = entityPostCode.genParseArray(entityStream);


    return colorEntityStream;

}


// await callGenerateColors();

// console.log("Start");
// for await (const data of await callGenerateColors()) {
//     console.log(data);
// }


// for await (const entity of entityStream) {
//     console.log(entity);
// }



// Mock

// mock stream
const mockStream = readFileAndStreamContent("./output_postcode_partial.txt");
// Parser
const mockEnitytStream = handleMockResponse(mockStream, PostCodeSchema, StreamMode.StreamObjectKeyValueTokens);

for await (const entity of mockEnitytStream) {
    console.log(entity);
}

