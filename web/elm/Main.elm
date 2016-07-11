import Html exposing (Html, button, div, text, table, tr, td)
import Html.App as Html
import String
import Navigation
import Suites
import Router exposing (..)
import Phoenix

type alias Model =
  {- world state -}
  { suites : Suites.Model
  , suite: Maybe Suites.Suite
  {-app state -}
  , page : Page,
  , socket : Phoenix.Socket.Socket Msg
  }


type Msg
  = SuitesAction Suites.Action


main = Navigation.program (Navigation.makeParser urlParser)
  { init = init
  , view = view
  , update = update
  , urlUpdate = urlUpdate
  , subscriptions = subscriptions
  }

initialState = 
  { suites = Suites.model
  , page = SuitesPage
  , suite = Nothing
  }

init : Result String Page -> (Model, Cmd Msg)
init result = urlUpdate result initialState


update : Msg -> Model -> (Model, Cmd Msg)
update msg model =
  case msg of
    SuitesAction action ->
      { model | suites = (Suites.update action model.suites) } ! []

view : Model -> Html Msg
view model =
  div [] [
    viewForRoute model
  ]


viewForRoute : Model -> Html Msg
viewForRoute model =
  case model.page of
    SuitesPage ->
      Html.map (\action -> SuitesAction action) (Suites.listView model.suites)
    SuitePage _ ->
      Html.map (\action -> SuitesAction action) (Suites.singleView model.suite)

subscriptions : Model -> Sub Msg
subscriptions model = Sub.none

urlUpdate : Result String Page -> Model -> (Model, Cmd Msg)
urlUpdate result model =
  case Debug.log "result" result of
    Err _ -> model ! [ Navigation.modifyUrl (pageToRoute model.page)]
    Ok page -> { model | page = page } ! []


