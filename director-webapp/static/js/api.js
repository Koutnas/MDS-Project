//API Call
async function refreshSpeakers() {
    try {
        const response = await fetch("/api/refresh-speakers");
        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }
        const data = await response.json();
        const activeIds = new Set();
        var defSelected = true;

        for (const speaker of data) {
            activeIds.add(String(speaker.uniqueId));
            //Build only when it doesnt exist
            if (!document.getElementById(`row-${speaker.uniqueId}`)) {
                updateWebUI(speaker.port, speaker.psk, speaker.uniqueId);
            }
            setCardLive(speaker.uniqueId,speaker.is_selected,speaker.is_up)
            if(speaker.is_up){
                defSelected=false
            }
        }
        if(defSelected){
            setCardLive("0",true,true)
        }
        //Pruning for deleted 
        const tableBody = document.getElementById('credentials-table-body');
        const allRows = Array.from(tableBody.children); 

        for (const row of allRows) {
            const uniqueId = row.id.replace('row-', '');
            if (!activeIds.has(uniqueId)) {
                row.remove();
                document.getElementById(`card-${uniqueId}`)?.remove();
            }
        }
    } catch (error) {
        console.error(error.message);
    }
}

async function addSpeaker() {
    try {
        const response = await fetch("/api/add-speaker");
        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }
    } catch (error) {
        console.error(error.message);
    }
    await refreshSpeakers()
}

async function refreshPreviews() {
    try {
        const response = await fetch("/api/refresh-preview");
        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }
        const data = await response.json();
        for (const [uniqueId, uri] of Object.entries(data)) {
            if (!uri) continue;
            
            const img = document.querySelector(`#card-${uniqueId} img`);
            if (img) img.src = uri;
        }
    } catch (error) {
        console.error(error.message);
    }
}

//Generic post function
async function postJson(url, payload) {
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }
        const result = await response.json();
        console.log(result);
        return result;
    } catch (error) {
        console.error(error.message);
        return null;
    }
}

async function deleteSpeaker(uniqueId) {
    await postJson("/api/remove-speaker", { uniqueId });
    await refreshSpeakers();
}

async function switchScene(uniqueId) {
    await postJson("/api/switch-scene", { uniqueId });
    await refreshSpeakers();
}

setInterval(async () => {
    // Syncs the table and adds/removes DOM elements based on server state
    await refreshSpeakers(); 
    await refreshPreviews()

}, 2000); // Automatically call when the page is reloaded