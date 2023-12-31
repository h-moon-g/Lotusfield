from flask import Blueprint, request
from flask_login import login_required, current_user
from app.models import db, Deck, MagicCard
from app.forms.new_card_form import CreateCardForm
from app.forms.add_card_form import AddCardToDeckForm
from app.api.auth_routes import validation_errors_to_error_messages
from app.api.aws_helpers import get_unique_filename, upload_file_to_s3, remove_file_from_s3

card_routes = Blueprint('cards', __name__)


@card_routes.route('/add', methods=['POST'])
@login_required
def create_new_card():
    """
    Creates new card. Creates relationship between card and deck. Returns dictionary.
    """
    form = CreateCardForm()

    form['csrf_token'].data = request.cookies['csrf_token']


    if form.validate_on_submit():
        card_image = form.data['card_image_url']
        card_image.filename = get_unique_filename(card_image.filename)

        card_upload = upload_file_to_s3(card_image)
        if "url" not in card_upload:
            return { 'errors': {'message': 'Oops! something went wrong on our end '}}, 500
        card_url = card_upload['url']

        new_card = MagicCard (
            name = form.data['card_name'],
            color_identity = form.data['color_identity'],
            type = form.data['type'],
            image_url = card_url
        )
        db.session.add(new_card)
        db.session.commit()

        deck_for_card = Deck.query.get(form.data['deck_id'])

        deck_for_card.cards_in_deck.append(new_card)
        new_card.decks_with_card.append(deck_for_card)
        db.session.commit()

        return {"deck": deck_for_card.to_dict(), "card": new_card.to_dict()}
    return { 'errors': validation_errors_to_error_messages(form.errors) }, 400


@card_routes.route('/update', methods=['PUT'])
@login_required
def add_card_to_deck():
    """
    Creates new card. Creates relationship between card and deck. Returns dictionary.
    """
    form = AddCardToDeckForm()

    form['csrf_token'].data = request.cookies['csrf_token']


    if form.validate_on_submit():
        card_for_deck = MagicCard.query.get(form.data['card_id'])
        deck_for_card = Deck.query.get(form.data['deck_id'])

        deck_for_card.cards_in_deck.append(card_for_deck)
        card_for_deck.decks_with_card.append(deck_for_card)
        db.session.commit()

        return {"deck": deck_for_card.to_dict(), "card": card_for_deck.to_dict()}
    return { 'errors': validation_errors_to_error_messages(form.errors) }, 400


@card_routes.route('/<int:deckId>/<int:cardId>/delete', methods=['DELETE'])
@login_required
def remove_card_from_deck(deckId, cardId):
    """
    Removes card from deck.
    """
    removed_card = MagicCard.query.get(cardId)
    deck_with_card = Deck.query.get(deckId)

    cardIdx = deck_with_card.cards_in_deck.index(removed_card)

    deck_with_card.cards_in_deck.pop(cardIdx)
    db.session.commit()

    return {"deck": deck_with_card.to_dict(), "card": removed_card.to_dict()}
