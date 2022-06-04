let formElement = document.getElementById("form");
let submitButton = document.getElementById("submit");

function resetSubmitButton() {
  submitButton.disabled = false;
  submitButton.innerText = "Submit!";
}

function onSubmit(e) {
  e.preventDefault();
  let contentElement = document.getElementById("tldr");
  let descriptionElement = document.getElementById("desc");
  submitButton.disabled = true;
  submitButton.innerText = "Submitting";
  fetch("/api/submit", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content: contentElement.value,
      description: descriptionElement.value,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      contentElement.value = "";
      descriptionElement.value = "";
      submitButton.innerText = "Submitted!";
      setTimeout(resetSubmitButton, 2000);
    });
}

formElement.onsubmit = onSubmit;
