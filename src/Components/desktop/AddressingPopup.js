import React from "react";
import UserList from "./UserList";
import "./../../assets/css/AddressingPopup.css";

const closeBtn = require("../../assets/images/smaller-exit-button.png");

const AddressingPopup = ({ closePopup }) => {
    return (
        <div className="popup-window">
            <div>
                <div className="popup-header">
                    <h1 className="h1Style">Add Person</h1>

                    <button onClick={closePopup} className="close-button" >
                        <img alt="Close" src={closeBtn} />
                    </button>

                </div>

                <UserList afterClick={closePopup}  />
            </div>
        </div>
    );
}
export default AddressingPopup;
