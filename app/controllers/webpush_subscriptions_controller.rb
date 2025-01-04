class WebpushSubscriptionsController < ApplicationController
  def index
  end

  def create
    Subscription.create!(params.expect(subscription: [:endpoint]))

    head :created
  end
end
