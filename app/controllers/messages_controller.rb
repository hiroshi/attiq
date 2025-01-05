class MessagesController < ApplicationController
  def create
    subscription = Subscription.find_by(id: params[:subscription_id])
    endpoint = subscription.endpoint
    Webpush.post(endpoint:)

    head :created
  end
end
