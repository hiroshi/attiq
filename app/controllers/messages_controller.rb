class MessagesController < ApplicationController
  include SessionsConcern

  # Allow oauth token or post_key only for #create
  skip_before_action :verify_authenticity_token, if: -> {
    return false unless action_name == 'create'

    post_key = request.headers['Authentication']&.split&.last || params[:post_key]
    if post_key.present?
      set_current_user(User.where(post_key:).first)
      true
    end
  }

  before_action :login_required

  def index
    if params[:parent_id]
      criteria = Message.where(parent_id: params[:parent_id])
    else
      criteria = Message.where(:parent_id.exists => false)
    end
    messages = criteria.order_by(id: :desc).where('$or': [{sender: current_user}, {receiver: current_user}])

    render json: as_json(messages)
  end

  def show
    if request.format.json?
      message = Message.find(params[:id])

      render json: as_json(message)
    else
      render html: '', layout: 'application'
    end
  end

  def create
    email = params[:email]
    if email.present?
      receiver = User.find_or_create_by(email:)
    else
      receiver = current_user
    end

    # head :forbidden
    # return

    payload = params.expect(payload: {}).to_hash
    message = Message.new(payload:, sender: current_user, receiver:)
    if params[:parent_id].present?
      message.parent_id = params[:parent_id]
    end
    message.save!

    subscription_id = params[:subscription_id]
    if subscription_id.present?
      subscription = Subscription.find_by(id: subscription_id)
      payload['path'] = message_path(message)
      Webpush.post(subscription:, payload:)
    end
    head :created
  end

  def destroy
    # FIXME: auth current_user
    Message.where(id: params[:id]).destroy
  end

  private

  def as_json(sender)
    inc_opts = { only: [:_id, :email] }
    sender.as_json(
      include: { receiver: inc_opts, sender: inc_opts },
      except: [:receiver_id, :sender_id],
      methods: [:comments_count]
    )
  end
end
