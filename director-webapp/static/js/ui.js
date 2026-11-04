//Function interacting with the webUI itself.
function updateWebUI(port,psk,uniqueId, is_selected){

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

    card.className = `card bg-dark border-secondary mb-3 preview-card position-relative`;
    card.id = `card-${uniqueId}`;
    card.setAttribute('onclick', `switchScene('${uniqueId}')`);
    card.innerHTML = `
        <img src="https://via.placeholder.com/640x360/1a1a1a/ffffff?text=${encodeURIComponent(speakerName)}" class="card-img-top" alt="${speakerName}">
        <div class="card-body p-2 text-center">
            <span class="small fw-bold">${speakerName}</span>
        </div>
    `;
    sidebar.appendChild(card);

}

function setCardLive(uniqueId, isSelected, isUp) {
    const card = document.getElementById(`card-${uniqueId}`);
    if (!card) return;
    card.classList.toggle('border-success', isSelected);
    card.classList.toggle('border-warning', !isUp);
    card.classList.toggle('border-danger', !isUp && isSelected);
    card.classList.toggle('shadow-lg', isSelected);
    card.classList.toggle('border-secondary', !isSelected);
    card.querySelector('.badge')?.remove();
    if (isSelected && isUp) {
        card.insertAdjacentHTML('afterbegin',
            '<span class="badge bg-success position-absolute top-0 end-0 m-2">Live</span>');
    } else if(isSelected && !isUp){
        card.insertAdjacentHTML('afterbegin',
            '<span class="badge bg-danger position-absolute top-0 end-0 m-2">Live and Down</span>');
    } else if(!isUp){
        card.insertAdjacentHTML('afterbegin',
            '<span class="badge bg-warning position-absolute top-0 end-0 m-2">Down</span>');
    }
}

