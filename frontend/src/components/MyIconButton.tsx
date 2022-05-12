import "./MyIconButton.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPaperPlane } from "@fortawesome/free-solid-svg-icons";

const icons = {
  "paper-plane": faPaperPlane,
};

function MyIconButton(props) {
  const { title, onClick, icon } = props;
  return (
    <div className="MyIconButton" title={title} onClick={onClick}>
      <FontAwesomeIcon icon={icons[icon]} size="2x" />
    </div>
  );
}

export default MyIconButton;
