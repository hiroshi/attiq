class WebpushSubscriptionsController < ApplicationController
  def index
  end

  def create
    head :created
  end
end
