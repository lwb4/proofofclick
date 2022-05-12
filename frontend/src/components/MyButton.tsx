import "./MyButton.css";

function MyButton({ onClick, children }) {
  return (
    <div className="MyButton" onClick={onClick}>
      <div>{children}</div>
    </div>
  );
}

export default MyButton;
