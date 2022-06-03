let formElement = document.getElementById("form");

function onSubmit(e) {
  e.preventDefault();

  fetch("/api/submit", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content: document.getElementById("tldr").value,
      description: document.getElementById("desc").value,
    }),
  })
    .then((response) => response.json())
    .then((data) => {});
}

formElement.onsubmit = onSubmit;
