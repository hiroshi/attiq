class SubscriptionsController < ApplicationController
  include SessionsConcern
  before_action :login_required

  def index
    subscriptions = current_user.subscriptions.where(:name.exists => true).all
    render json: subscriptions.as_json(only: [:_id, :name], methods: [:endpoint_sha1])
  end

  def create
    current_user.subscriptions.create!(params.expect(subscription: [:name, :endpoint, :auth, :p256dh]))

    head :created
  end

  def destroy
    subscription = current_user.subscriptions.find(params[:id])
    subscription.destroy!
  end
end
