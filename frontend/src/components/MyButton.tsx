import "./MyButton.css";

function MyButton({ onClick, disabled = false, children }) {
  let classes = ["MyButton"];
  if (disabled) {
    classes.push("MyButtonDisabled");
  }
  return (
    <div className={classes.join(" ")} onClick={onClick}>
      <div>{children}</div>
    </div>
  );
}

export default MyButton;
