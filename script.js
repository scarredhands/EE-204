const canvas = document.getElementById('circuitCanvas');
const ctx = canvas.getContext('2d');

let isDragging = false;
let isConnecting = false;
let dragItem = null;
let startComponent = null;
let components = [];
let connections = [];
let tempConnection = null;
let connectionMode = false;
let lastTapTime = 0;

// Add styles for the value dialog
const style = document.createElement('style');
style.textContent = `
    .value-dialog {
        position: fixed;
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        z-index: 1000;
    }
    .value-dialog input {
        margin: 10px 0;
        padding: 5px;
        width: 150px;
    }
    .value-dialog button {
        margin: 5px;
        padding: 5px 10px;
        background: #007BFF;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }
    .value-dialog button:hover {
        background: #0056b3;
    }
    .value-dialog select {
        margin: 10px 0;
        padding: 5px;
        width: 150px;
    }
`;
document.head.appendChild(style);

// Add a connection mode button to the toolbar
const connectionBtn = document.createElement('button');
connectionBtn.className = 'button';
connectionBtn.id = 'connectionBtn';
connectionBtn.textContent = 'Connection Mode: OFF';
document.querySelector('.toolbar').appendChild(connectionBtn);

// Toggle connection mode
connectionBtn.addEventListener('click', () => {
    connectionMode = !connectionMode;
    connectionBtn.textContent = `Connection Mode: ${connectionMode ? 'ON' : 'OFF'}`;
    connectionBtn.style.backgroundColor = connectionMode ? '#ff4444' : '#007BFF';
});

function createValueDialog(component) {
    const dialog = document.createElement('div');
    dialog.className = 'value-dialog';
    
    const valueInput = document.createElement('input');
    valueInput.type = 'number';
    valueInput.step = '0.1';
    valueInput.value = component.value || '';
    valueInput.placeholder = 'Enter value';

    const unitSelect = document.createElement('select');
    let units;
    
    switch(component.type) {
        case 'resistor':
            units = ['Ω', 'kΩ', 'MΩ'];
            break;
        case 'capacitor':
            units = ['pF', 'nF', 'µF', 'mF'];
            break;
        case 'inductor':
            units = ['µH', 'mH', 'H'];
            break;
        case 'battery':
            units = ['V'];
            break;
    }
    
    units.forEach(unit => {
        const option = document.createElement('option');
        option.value = unit;
        option.textContent = unit;
        if (unit === component.unit) option.selected = true;
        unitSelect.appendChild(option);
    });

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';

    dialog.appendChild(valueInput);
    dialog.appendChild(unitSelect);
    dialog.appendChild(saveBtn);
    dialog.appendChild(cancelBtn);

    // Position dialog near the component
    dialog.style.left = `${component.x + canvas.offsetLeft + component.width}px`;
    dialog.style.top = `${component.y + canvas.offsetTop}px`;

    saveBtn.onclick = () => {
        component.value = valueInput.value;
        component.unit = unitSelect.value;
        document.body.removeChild(dialog);
        draw();
    };

    cancelBtn.onclick = () => {
        document.body.removeChild(dialog);
    };

    document.body.appendChild(dialog);
    valueInput.focus();
}

function addComponent(type) {
    const componentTypes = {
        resistor: { color: 'blue', label: 'R', type: 'resistor' },
        capacitor: { color: 'orange', label: 'C', type: 'capacitor' },
        inductor: { color: 'green', label: 'L', type: 'inductor' },
        battery: { color: 'yellow', label: 'B', type: 'battery' }
    };
    
    const component = {
        x: Math.random() * (canvas.width - 50),
        y: Math.random() * (canvas.height - 20),
        width: 50,
        height: 20,
        value: '',
        unit: '',
        ...componentTypes[type]
    };
    
    components.push(component);
    draw();
}

// Mouse and Touch Event Handlers
canvas.addEventListener('mousedown', handleStart);
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleStart(e.touches[0]);
});

canvas.addEventListener('mousemove', handleMove);
canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    handleMove(e.touches[0]);
});

canvas.addEventListener('mouseup', handleEnd);
canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    handleEnd(e);
});

function handleStart(event) {
    const pos = getEventPos(event);
    const clickedComponent = findComponentUnderMouse(pos);
    
    if (connectionMode && clickedComponent) {
        if (!startComponent) {
            isConnecting = true;
            startComponent = clickedComponent;
            tempConnection = {
                start: {
                    x: clickedComponent.x + clickedComponent.width / 2,
                    y: clickedComponent.y + clickedComponent.height / 2
                },
                end: { x: pos.x, y: pos.y }
            };
        }
    } else if (clickedComponent) {
        isDragging = true;
        dragItem = clickedComponent;
        dragItem.offsetX = pos.x - clickedComponent.x;
        dragItem.offsetY = pos.y - clickedComponent.y;
    }
}

function handleMove(event) {
    const pos = getEventPos(event);
    
    if (isDragging && dragItem) {
        dragItem.x = pos.x - dragItem.offsetX;
        dragItem.y = pos.y - dragItem.offsetY;
        
        // Update connected wires
        connections.forEach(connection => {
            if (connection.startComponent === dragItem) {
                connection.start.x = dragItem.x + dragItem.width / 2;
                connection.start.y = dragItem.y + dragItem.height / 2;
            }
            if (connection.endComponent === dragItem) {
                connection.end.x = dragItem.x + dragItem.width / 2;
                connection.end.y = dragItem.y + dragItem.height / 2;
            }
        });
    }
    
    if (isConnecting && tempConnection) {
        tempConnection.end.x = pos.x;
        tempConnection.end.y = pos.y;
    }
    
    draw();
}

function handleEnd(event) {
    if (isConnecting && startComponent) {
        const pos = getEventPos(event.changedTouches ? event.changedTouches[0] : event);
        const endComponent = findComponentUnderMouse(pos);
        
        if (endComponent && endComponent !== startComponent) {
            connections.push({
                start: {
                    x: startComponent.x + startComponent.width / 2,
                    y: startComponent.y + startComponent.height / 2
                },
                end: {
                    x: endComponent.x + endComponent.width / 2,
                    y: endComponent.y + endComponent.height / 2
                },
                startComponent: startComponent,
                endComponent: endComponent
            });
        }
        isConnecting = false;
        startComponent = null;
        tempConnection = null;
    }
    
    isDragging = false;
    dragItem = null;
    draw();
}

// Double-click handler
canvas.addEventListener('dblclick', handleDoubleClick);
canvas.addEventListener('touchend', (e) => {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTapTime;
    
    if (tapLength < 500 && tapLength > 0) {
        e.preventDefault();
        handleDoubleClick(e.changedTouches[0]);
    }
    lastTapTime = currentTime;
});

function handleDoubleClick(event) {
    const pos = getEventPos(event);
    const clickedComponent = findComponentUnderMouse(pos);
    
    if (clickedComponent) {
        createValueDialog(clickedComponent);
    }
}

function findComponentUnderMouse(pos) {
    return components.find(component => 
        pos.x >= component.x &&
        pos.x <= component.x + component.width &&
        pos.y >= component.y &&
        pos.y <= component.y + component.height
    );
}

function getEventPos(event) {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX || event.pageX) - rect.left;
    const y = (event.clientY || event.pageY) - rect.top;
    return { x, y };
}

function drawConnection(connection, color) {
    ctx.beginPath();
    ctx.moveTo(connection.start.x, connection.start.y);
    ctx.lineTo(connection.end.x, connection.end.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw connections
    connections.forEach(connection => {
        drawConnection(connection, 'red');
    });
    
    if (tempConnection) {
        drawConnection(tempConnection, 'blue');
    }
    
    // Draw components
    components.forEach(component => {
        // Draw component box
        ctx.fillStyle = component.color;
        ctx.fillRect(component.x, component.y, component.width, component.height);
        
        // Draw component label
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Arial';
        ctx.fillText(component.label, 
            component.x + component.width/2 - 5, 
            component.y + component.height/2 + 5
        );
        
        // Draw component value if it exists
        if (component.value) {
            ctx.fillStyle = 'black';
            ctx.font = '12px Arial';
            const valueText = `${component.value}${component.unit}`;
            ctx.fillText(valueText, 
                component.x + component.width/2 - ctx.measureText(valueText).width/2, 
                component.y + component.height + 15
            );
        }
    });
}

// Prevent context menu on right-click
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// Add component buttons
document.getElementById('addResistorBtn').addEventListener('click', () => addComponent('resistor'));
document.getElementById('addCapacitorBtn').addEventListener('click', () => addComponent('capacitor'));
document.getElementById('addInductorBtn').addEventListener('click', () => addComponent('inductor'));
document.getElementById('addBatteryBtn').addEventListener('click', () => addComponent('battery'));