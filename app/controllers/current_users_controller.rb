class CurrentUsersController < ApplicationController
  include SessionsConcern
  before_action :login_required, only: [:show]

  def show
    render json: current_user
  end
end
