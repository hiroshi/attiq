class TestsController < ApplicationController
  skip_before_action :verify_authenticity_token, only: [:create]

  def create
    head :created
  end
end
