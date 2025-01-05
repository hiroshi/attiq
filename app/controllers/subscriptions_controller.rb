class SubscriptionsController < ApplicationController
  def index
    subscriptions = Subscription.where(:name.exists => true).all
    render json: subscriptions.as_json(only: [:_id, :name])
  end

  def create
    Subscription.create!(params.expect(subscription: [:endpoint, :name]))

    head :created
  end
end
