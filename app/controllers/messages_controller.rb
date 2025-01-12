class MessagesController < ApplicationController
  def create
    subscription = Subscription.find_by(id: params[:subscription_id])
    Webpush.post(subscription:, payload: params[:payload])

    head :created
  end
end
