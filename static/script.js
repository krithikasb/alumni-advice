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
    .then((advice) => {
      contentElement.value = "";
      descriptionElement.value = "";
      submitButton.innerText = "Submitted!";
      document.getElementById("thankyou").style.display = "block";
      setTimeout(() => {
        resetSubmitButton();
        document.getElementById("thankyou").style.display = "none";
      }, 4000);
      let ul = document.getElementById("allAdvice");
      let li = createAdviceListItem(advice);
      ul.appendChild(li);
    });
}

function createAdviceListItem(advice) {
  let li = document.createElement("li");
  if (advice.description) {
    li.innerText = advice.content + "\n\n" + advice.description;
  } else {
    li.innerText = advice.content;
  }
  return li;
}

window.onload = function () {
  fetch("/api/getAllAdvice", {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      let ul = document.getElementById("allAdvice");
      for (let advice of data) {
        let li = createAdviceListItem(advice);
        ul.appendChild(li);
      }
    });
};

formElement.onsubmit = onSubmit;
