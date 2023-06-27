var api_key = ""
var unfiltered_all_Voices;
var all_Voices = [];
var string_To_Splice
var answer;
var isKeyOwner = false;
var allowKeySharing = false;

Hooks.once('init', () => { 
    game.settings.register("elevenlabs-for-foundry","xi-api-key",{
        name: "API-Key",
        hint: "Your Elevenlabs API Key",
        scope:"client",
        config: true,
        type: String
    });
    
    Initialize_Main(); })
Hooks.once('setup', () => { })
Hooks.on('chatMessage', (log, message) => { try { Play_Sound(message) } catch { }; return false })
Hooks.on("ready", () => {
    game.socket.on('module.elevenlabs-for-foundry', ({ testarg, container }) => {
        runPlaySound(container)

    })
})

async function Initialize_Main(){
    api_key=game.settings.get("elevenlabs-for-foundry","xi-api-key")
    if(api_key){
        Get_Voices()
    }
}

function Play_Sound(message) {
    if (message.startsWith("/play")) {
        if(api_key){
            Create_Window()
        }
        else {
            Set_Key_Window()
        }
    }
}

async function runPlaySound(chunks) {
    let blob = new Blob(chunks, { type: 'audio/mpeg' })
    let url = window.URL.createObjectURL(blob)
    AudioHelper.play({ src: url, volume: 1.0, loop: false }, false)
}




async function Get_Voices() {
    await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: {
            'accept': 'application/json',
            'xi-api-key': api_key
        }
    }).then(response => response.text()).
        then(text => unfiltered_all_Voices = text)
    Split_Voices()
}
function Split_Voices() {
    string_To_Splice = unfiltered_all_Voices.substring(unfiltered_all_Voices.indexOf("[{") + 1)
    Split_Voices_Sub()
}

function Split_Voices_Sub() {
    var i = string_To_Splice.indexOf(",{\"voice_id\"")
    if (i > 0) {

        var text = string_To_Splice.substring(0, i)
        all_Voices[all_Voices.length] = JSON.parse(text)
        string_To_Splice = string_To_Splice.substring(i + 1)
        Split_Voices_Sub()
    }
    else if (string_To_Splice.indexOf("{\"voice_id\"") == 0) {
        all_Voices[all_Voices.length] = JSON.parse(string_To_Splice.substring(0, string_To_Splice.indexOf("]}")))
    }
}






async function Text_To_Speech(voiceID,text) {
    let container = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + voiceID, {
        method: 'POST',
        headers: {
            'accept': 'audio/mpeg',
            'xi-api-key': api_key,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            "text": text,
            "model_id": "eleven_monolingual_v1"
        })
    }
    )
    let reader = container.body.getReader()
    let chunks = []
    while (true) {
        let { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
    }
    game.socket.emit('module.elevenlabs-for-foundry', { testarg: "Hello World", container: chunks })
    let blob = new Blob(chunks, { type: 'audio/mpeg' })
    let url = window.URL.createObjectURL(blob)
    AudioHelper.play({ src: url, volume: 1.0, loop: false }, false)
}



async function Voice_Field() {
    let allVoices_Voice_Field = "<select name=\"allVoices_Voice_Field\" id=\"allVoices_Voice_Field\">"
    for (let i = (all_Voices.length - 1); i > 0; i--) {
        allVoices_Voice_Field += `<option value=${all_Voices[i].voice_id}>${all_Voices[i].name}</option>`
    }
    allVoices_Voice_Field += "</select>"
    let voiceID;
    let value = await new Promise((resolve) => {
        new Dialog({
            title: `Send Audio`,
            content: `<table style="width:100%"><tr><th style="width:50%">${allVoices_Voice_Field}</th><td style="width:50%"><input type="text" name="input"/></td></tr></table>`,
            buttons: {
                Ok: { label: `Send`, callback: (html) => { 
                    resolve(html.find("input").val());
                    let select=document.getElementById("allVoices_Voice_Field");
                    voiceID=select.options[select.selectedIndex].value;
                } },
            }
        }).render(true);
    });
    return [voiceID, value];
}

async function Create_Window() {
    let split = await Voice_Field();
    let voice=split[0]
    let text=split[1]
    Text_To_Speech(voice,text)
}



async function Set_Key(){
    let value = await new Promise((resolve) => {
        new Dialog({
            title: `Set Elevenlabs Key`,
            content: `<table style="width:100%"><tr><th style="width:50%">"Set Your Key"</th><td style="width:50%"><input type="text" name="input"/></td></tr></table>`,
            buttons: {
                Ok: { label: `Send`, callback: (html) => { 
                    resolve(html.find("input").val());
                } },
            }
        }).render(true);
    });
    return value;
}

async function Set_Key_Window(){
    api_key = await Set_Key()
    game.settings.set("elevenlabs-for-foundry","xi-api-key",api_key)
    Get_Voices()
}