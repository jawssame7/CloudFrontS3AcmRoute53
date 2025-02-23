document.addEventListener("DOMContentLoaded", () => {
    console.log("ページが読み込まれました。");

    const button = document.getElementById("colorChangeButton");
    if (button) {
        button.addEventListener("click", () => {
            document.body.style.backgroundColor = document.body.style.backgroundColor === "rgb(240, 240, 240)" ? "rgb(21, 160, 111)" : "rgb(240, 240, 240)";
        });
    }
});