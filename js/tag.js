/* ==========================================================
    SAMPLE TAGS
========================================================== */

const tags = [

    { name: "Chill", icon: "moon" },
    { name: "Rain", icon: "cloud-rain" },
    { name: "Night", icon: "moon-star" },
    { name: "Lofi", icon: "audio-waveform" },
    { name: "Drive", icon: "car-front" },

    { name: "Study", icon: "book-open" },
    { name: "Piano", icon: "piano" },
    { name: "Coding", icon: "code-xml" },
    { name: "Focus", icon: "crosshair" },
    { name: "Sleep", icon: "bed" },

    { name: "Jazz", icon: "music-4" },
    { name: "Nature", icon: "leaf" },
    { name: "Travel", icon: "plane" },
    { name: "Happy", icon: "smile" },
    { name: "Relax", icon: "flower-2" }

];

/* ==========================================================
    ELEMENTS
========================================================== */

const grid = document.getElementById("tagGrid");

const menu = document.getElementById("tagMenu");

const manageButton = document.getElementById("tagManageButton");

/* ==========================================================
    CREATE TAGS
========================================================== */

function createTags() {

    grid.innerHTML = "";

    tags.forEach(tag => {

        const button = document.createElement("button");

        button.className = "tag";

        button.innerHTML = `

            <div class="tag-circle">

                <i data-lucide="${tag.icon}"></i>

            </div>

            <span>${tag.name}</span>

        `;

        button.addEventListener("click", () => {

            button.classList.toggle("selected");

        });

        grid.appendChild(button);

    });

    lucide.createIcons();

}

/* ==========================================================
    MENU
========================================================== */

manageButton.addEventListener("click", (e) => {

    e.stopPropagation();

    menu.classList.toggle("show");

});

document.addEventListener("click", () => {

    menu.classList.remove("show");

});

/* ==========================================================
    SEARCH
========================================================== */

document.getElementById("tagSearch").addEventListener("input", e => {

    const value = e.target.value.toLowerCase();

    document.querySelectorAll(".tag").forEach(tag => {

        tag.style.display =

            tag.innerText.toLowerCase().includes(value)

                ? ""

                : "none";

    });

});

/* ==========================================================
    START
========================================================== */

createTags();