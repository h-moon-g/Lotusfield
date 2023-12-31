import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { NavLink, useParams } from "react-router-dom";
import "./DeckDetails.css";
import { getAllDecks } from "../../store/decks";
import { getAllCards } from "../../store/cards";
import { getAllComments } from "../../store/comments";
import fetchAll from "../utils";
import { ThunkAddCardToDBAndDeck } from "../../store/cards";
import { ThunkAddCardToDeck } from "../../store/cards";
import { ThunkRemoveCard } from "../../store/cards";
import { ThunkAddCommentToDeck } from "../../store/comments";
import OpenModalButton from "../OpenModalButton/index";
import UpdateDeckModal from "../UpdateDeckModal";
import DeleteDeckModal from "../DeleteDeckModal";
import DeleteCommentModal from "../DeleteCommentModal";
import UpdateCommentModal from "../UpdateCommentModal";

export default function DeckDetails() {
  const { id } = useParams();

  const user = useSelector((state) => state.session.user);
  const decks = useSelector((state) => state.decks);
  const cards = useSelector((state) => state.cards);
  const comments = useSelector((state) => state.comments);

  const [addCard, setAddCard] = useState("");
  const [addComment, setAddComment] = useState("");
  const [errors, setErrors] = useState({});

  const dispatch = useDispatch();

  const currentDeck = decks[id];

  if (!currentDeck) {
    fetchAll(dispatch, getAllDecks, getAllCards, getAllComments);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    let formData = new FormData();
    let apiFetch = await fetch(
      `https://api.scryfall.com/cards/named?exact=${addCard}`
    );
    let apiCard = await apiFetch.json();
    if (apiCard?.name) {
      const cardInLocalDB = Object.values(cards).find(
        (card) => card.name === apiCard?.name
      );
      if (cardInLocalDB) {
        const cardInCurrentDeck = currentDeck.cardsInDeck.find(
          (card) => card === cardInLocalDB.id
        );
        if (cardInCurrentDeck) {
          setErrors({ addCard: "Card already in deck!" });
          return null;
        }
        formData.append("card_id", cardInLocalDB.id);
        formData.append("deck_id", currentDeck.id);
        let data = await dispatch(ThunkAddCardToDeck(formData));
        if (data?.errors) {
          setErrors(data.errors);
        } else {
          setAddCard("");
        }
      } else {
        const borderImage = apiCard.image_uris.border_crop;
        let borderFile = null;
        await fetch(`${borderImage}`)
          .then((res) => res.blob())
          .then((myBlob) => {
            borderFile = new File([myBlob], "border_image.jpeg", {
              type: myBlob.type,
            });
          });
        formData.append("card_image_url", borderFile);
        formData.append("color_identity", apiCard.color_identity.join(""));
        formData.append("card_name", apiCard.name);
        formData.append("type", apiCard.type_line);
        formData.append("deck_id", currentDeck.id);
        let data = await dispatch(ThunkAddCardToDBAndDeck(formData));
        if (data?.errors) {
          setErrors(data.errors);
        } else {
          if (errors?.addCard) {
            setErrors({});
          }
          setErrors({});
          setAddCard("");
        }
      }
    } else {
      setErrors({ addCard: "Invalid cardname!" });
      return null;
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    let formData = new FormData();
    formData.append("deck_id", currentDeck.id);
    formData.append("user_id", user.id);
    formData.append("message", addComment);
    let data = await dispatch(ThunkAddCommentToDeck(formData));
    if (data?.errors) {
      setErrors(data.errors);
    } else {
      setErrors({});
      setAddComment("");
    }
  };

  const handleCardDelete = async (id) => {
    let data = await dispatch(ThunkRemoveCard(id, currentDeck.id));
    if (data.errors) {
      setErrors(data.errors);
    }
  };

  let cardDisplay = null;

  const cardsInDeckArray = [];
  if (currentDeck) {
    for (let cardId of currentDeck.cardsInDeck) {
      cardsInDeckArray.push(cards[cardId]);
    }
  }
  cardDisplay = cardsInDeckArray.map((card) => {
    let deleteCardButton = null;
    if (user?.id === currentDeck.userId) {
      deleteCardButton = (
        <button id="remove-card" onClick={(e) => handleCardDelete(card?.id)}>
          Remove card
        </button>
      );
    }
    if (card?.id !== currentDeck.commanderId) {
      return (
        <div className="map-card-div">
          <img
            className="map-card-img"
            src={card?.imageUrl}
            alt={`Cover for ${card?.name}`}
          />
          <div id="rm-card-div">{deleteCardButton}</div>
        </div>
      );
    }
  });

  const randomButton = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    let apiFetch = await fetch(`https://api.scryfall.com/cards/random`);
    let apiCard = await apiFetch.json();
    if (apiCard?.name) {
      setAddCard(apiCard.name);
    }
  };

  let deckOptions = null;
  if (user?.id === currentDeck?.userId) {
    deckOptions = (
      <div>
        <div>
          <OpenModalButton
            buttonText="Update Deck"
            modalComponent={<UpdateDeckModal id={id} />}
          />
          <OpenModalButton
            buttonText="Delete Deck"
            modalComponent={<DeleteDeckModal id={id} />}
          />
        </div>
        <form onSubmit={handleSubmit}>
          <label className="login-label">
            Add a card!
            <input
              type="text"
              value={addCard}
              onChange={(e) => setAddCard(e.target.value)}
            />
          </label>
          {errors.addCard && <p id="dd-bar-error">{errors.addCard}</p>}
          <p className="filler">llll</p>
          <button
            onClick={randomButton}
            className="signup-button"
            id="randomize"
          >
            Randomize
          </button>
          <button type="submit" className="signup-button">
            Add card
          </button>
        </form>
      </div>
    );
  }

  let commentDisplay = null;
  const commentsAboutDeckArray = [];
  if (currentDeck) {
    for (let commentId of currentDeck.commentsAboutDeck) {
      commentsAboutDeckArray.push(comments[commentId]);
    }
  }
  commentDisplay = commentsAboutDeckArray.map((comment) => {
    let commentOptions = null;
    if (user?.id === comment?.userId) {
      commentOptions = (
        <div>
          <OpenModalButton
            buttonText="Update Comment"
            modalComponent={
              <UpdateCommentModal
                message={comment?.message}
                commentId={comment?.id}
              />
            }
          />
          <OpenModalButton
            buttonText="Delete Comment"
            modalComponent={
              <DeleteCommentModal
                commentId={comment?.id}
                deckId={currentDeck.id}
              />
            }
          />
        </div>
      );
    }
    return (
      <div id="dd-comment-div">
        <p id="dd-comment-user">{comment?.username}</p>
        <p id="dd-comment-msg">{comment?.message}</p>
        {commentOptions}
      </div>
    );
  });

  let addCommentDisplay = null;
  if (user?.id) {
    addCommentDisplay = (
      <form onSubmit={handleCommentSubmit}>
        <label className="login-label">
          Add a comment!
          <input
            type="text"
            value={addComment}
            onChange={(e) => setAddComment(e.target.value)}
          />
        </label>
        {errors.message && <p id="dd-comment-error">{errors.message}</p>}
        <p className="filler">llll</p>
        <button type="submit" className="signup-button">
          Add comment
        </button>
      </form>
    );
  }

  const commanderCard = cards[currentDeck?.commanderId];
  const commanderDisplay = (
    <div className="map-card-div">
      <img
        className="map-card-img"
        id="commander-card-img"
        src={commanderCard?.imageUrl}
        alt={`Cover for ${commanderCard?.name}`}
      />
    </div>
  );

  return (
    <div>
      <div id="dd-top-bar">
        <div id="dd-deck-info">
          <h1>{currentDeck?.name}</h1>
          <p>{currentDeck?.description}</p>
          {deckOptions}
        </div>
        <div id="dd-deck-img">
          <img src={currentDeck?.coverImageUrl} />
        </div>
      </div>
      <div className="home-map-text">
        <h3>Cards in deck</h3>
      </div>
      <div id="dd-card-wrapper">
        {commanderDisplay}
        {cardDisplay}
      </div>
      <div id="dd-comment-header">
        <h3>Comments about deck</h3>
      </div>
      <div id="dd-comment-wrapper">
        {commentDisplay}
        {addCommentDisplay}
      </div>
    </div>
  );
}
