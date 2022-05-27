let formElement = document.getElementById("form")

function onSubmit(e) {
  e.preventDefault();
}

formElement.onsubmit = onSubmit;
