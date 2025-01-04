class MessagesController < ApplicationController
  def create
    subscription = Subscription.first
    endpoint = subscription.endpoint
    Webpush.post(endpoint:)

    head :created
  end
end
