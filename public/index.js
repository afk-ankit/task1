
const button = document.querySelector('#submit')


button.addEventListener('click', (e) => {
    console.log("object");
    e.preventDefault()
    fetch('/dummy', {
        method: "DELETE",
        headers: {
            'Content-type': 'application/json'
        }
    })
});

