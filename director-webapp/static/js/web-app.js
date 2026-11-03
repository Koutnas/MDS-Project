let speakerCount = 0;

//API Call
async function addSpeaker() {
    try {
        const response = await fetch("/api/add-speaker");
        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }

        const result = await response.json();
        const { port, psk, uniqueId } = result;
        const speakerName = `Speaker ${port-9000}`


        const tableBody = document.getElementById('credentials-table-body');
        const row = document.createElement('tr');
        row.id = `row-${uniqueId}`;
        row.innerHTML = `
            <td><strong>${speakerName}</strong></td>
            <td class="font-monospace text-info">${uniqueId}</td>
            <td class="font-monospace text-warning">${port}</td>
            <td class="font-monospace">${psk}</td>
            <td>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteSpeaker('${uniqueId}', '${speakerName}')">Delete</button>
            </td>
        `;
        tableBody.appendChild(row);
        
        const sidebar = document.getElementById('preview-sidebar');
        const card = document.createElement('div');
        card.className = "card bg-dark border-secondary mb-3 preview-card";
        card.id = `card-${uniqueId}`;
        card.setAttribute('onclick', `pushLive('card-${uniqueId}', '${speakerName}')`);
        card.innerHTML = `
            <img src="https://via.placeholder.com/640x360/1a1a1a/ffffff?text=${encodeURIComponent(speakerName)}" class="card-img-top" alt="${speakerName}">
            <div class="card-body p-2 text-center">
                <span class="small fw-bold">${speakerName}</span>
            </div>
        `;
        sidebar.appendChild(card);
    } catch (error) {
        console.error(error.message);
    }
}

function pushLive(cardId, sceneName) {
    // Strip primary border from all cards, reset to secondary
    document.querySelectorAll('.preview-card').forEach(card => {
        card.classList.remove('border-primary');
        card.classList.add('border-secondary');
    });

    // Highlight the clicked card
    const activeCard = document.getElementById(cardId);
    activeCard.classList.remove('border-secondary');
    activeCard.classList.add('border-primary');

    console.log(`API Call: Switch OBS to ${sceneName}`);
    // fetch('/api/switch-scene', { method: 'POST', body: JSON.stringify({ scene: sceneName }) })
}
//API Call
async function deleteSpeaker(uniqueId) {
    // Remove from DOM
    document.getElementById(`row-${uniqueId}`).remove();
    document.getElementById(`card-${uniqueId}`).remove();
    try {
        const response = await fetch("/api/remove-speaker", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
                },
            body: JSON.stringify({ uniqueId: uniqueId }),
        });
        if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
        }

        const result = await response.json();
        console.log(result);
    } catch (error) {
        console.error(error.message);
    }
}