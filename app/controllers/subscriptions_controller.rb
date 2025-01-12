class SubscriptionsController < ApplicationController
  def index
    subscriptions = Subscription.where(:name.exists => true).all
    render json: subscriptions.as_json(only: [:_id, :name])
  end

  def create
    Subscription.create!(params.expect(subscription: [:name, :endpoint, :auth, :p256dh]))

    head :created
  end
end
